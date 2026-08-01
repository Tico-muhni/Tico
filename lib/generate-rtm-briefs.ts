import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmNewsItems, rtmBriefs, rtmRuns } from "@/drizzle/schema";
import {
  RTM_SEARCH_QUERIES,
  googleNewsRssUrl,
  textMatchesKeywords,
  isIsraeliSource,
} from "@/lib/rtm-news-sources";
import { fetchRssItems } from "@/lib/rtm-rss";
import { generateRtmBrief, getBriefModel } from "@/lib/rtm-brief";

// How many candidate articles to keep per scan for the user to pick from.
// Scanning is free (no AI), so this can be generous.
const MAX_CANDIDATES = 15;

type Candidate = {
  source: string;
  title: string;
  url: string;
  description: string | null;
  pubDate: string | null;
  matchedKeywords: string[];
};

function parsePubDate(pubDate: string | null): Date | null {
  if (!pubDate) return null;
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function relevanceScore(matchedKeywords: string[], parsedDate: Date | null): number {
  const keywordScore = matchedKeywords.length * 1000;
  const ageHours = parsedDate
    ? (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60)
    : 999;
  const recencyScore = Math.max(0, 100 - ageHours);
  return keywordScore + recencyScore;
}

/**
 * Scan Google News for relevant Israeli articles and store them as candidates.
 * This does NOT call the AI - it's free and unlimited. The user then picks which
 * candidates to turn into briefs via generateBriefForNewsItem.
 */
export async function scanForCandidates(maxCandidates = MAX_CANDIDATES) {
  const [run] = await db.insert(rtmRuns).values({ status: "running" }).returning();

  try {
    const byUrl = new Map<string, Candidate>();
    const feedErrors: string[] = [];

    for (const q of RTM_SEARCH_QUERIES) {
      try {
        const items = await fetchRssItems(googleNewsRssUrl(q.query));
        for (const item of items) {
          if (byUrl.has(item.link)) continue; // duplicate across queries
          const haystack = `${item.title} ${item.description ?? ""}`;
          const matchedKeywords = textMatchesKeywords(haystack);
          if (matchedKeywords.length === 0) continue;
          if (!isIsraeliSource(item.sourceUrl)) continue;

          byUrl.set(item.link, {
            source: item.source ?? "Google News",
            title: item.title,
            url: item.link,
            description: item.description,
            pubDate: item.pubDate,
            matchedKeywords,
          });
        }
      } catch (err) {
        feedErrors.push(
          `${q.label}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const ranked = [...byUrl.values()]
      .map((candidate) => {
        const parsedDate = parsePubDate(candidate.pubDate);
        return { candidate, parsedDate, score: relevanceScore(candidate.matchedKeywords, parsedDate) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates);

    // Upsert each of the current top articles onto THIS run. An article seen in
    // a previous scan is moved to the new run (its brief, if any, stays), so the
    // board always shows just the latest scan's articles - no history to scroll.
    let stored = 0;
    for (const { candidate, parsedDate } of ranked) {
      await db
        .insert(rtmNewsItems)
        .values({
          runId: run.id,
          source: candidate.source,
          title: candidate.title,
          url: candidate.url,
          summary: candidate.description,
          publishedAt: parsedDate,
          matchedKeywords: candidate.matchedKeywords,
        })
        .onConflictDoUpdate({
          target: rtmNewsItems.url,
          set: { runId: run.id, fetchedAt: sql`now()` },
        });
      stored += 1;
    }

    await db
      .update(rtmRuns)
      .set({
        status: "success",
        itemsFound: ranked.length,
        briefsGenerated: 0,
        feedErrors,
      })
      .where(eq(rtmRuns.id, run.id));

    return { stored, candidatesFound: ranked.length, feedErrors };
  } catch (err) {
    await db
      .update(rtmRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(rtmRuns.id, run.id));
    throw err;
  }
}

/**
 * Generate (and store) a brief for a single already-scanned news item.
 * This is the only step that calls the AI. Idempotent - if a brief already
 * exists for the item, it's returned as-is.
 */
export async function generateBriefForNewsItem(newsItemId: string) {
  const [item] = await db
    .select()
    .from(rtmNewsItems)
    .where(eq(rtmNewsItems.id, newsItemId))
    .limit(1);
  if (!item) throw new Error("הכתבה לא נמצאה");

  const [existing] = await db
    .select({ id: rtmBriefs.id })
    .from(rtmBriefs)
    .where(eq(rtmBriefs.newsItemId, newsItemId))
    .limit(1);
  if (existing) return; // already briefed

  const brief = await generateRtmBrief({
    source: item.source,
    title: item.title,
    summary: item.summary,
  });

  await db.insert(rtmBriefs).values({
    newsItemId,
    rank: 1,
    whatHappened: brief.whatHappened,
    meaningForMortgageHolders: brief.meaningForMortgageHolders,
    closingQuestion: brief.closingQuestion,
    aiModel: getBriefModel(),
  });
}
