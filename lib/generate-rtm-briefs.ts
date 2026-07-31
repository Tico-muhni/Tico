import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmNewsItems, rtmBriefs, rtmRuns } from "@/drizzle/schema";
import {
  RTM_SEARCH_QUERIES,
  googleNewsRssUrl,
  textMatchesKeywords,
} from "@/lib/rtm-news-sources";
import { fetchRssItems } from "@/lib/rtm-rss";
import { generateRtmBrief, getBriefModel } from "@/lib/rtm-brief";

// How many ranked briefs to produce per daily scan - a fixed, curated
// shortlist rather than an open-ended list of everything that matched.
const DAILY_BRIEF_COUNT = 3;

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
  // More recent items score higher, but never enough to outrank a clearly
  // more relevant (more keyword hits) item.
  const ageHours = parsedDate
    ? (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60)
    : 999;
  const recencyScore = Math.max(0, 100 - ageHours);
  return keywordScore + recencyScore;
}

export async function runRtmBriefGeneration(dailyCount = DAILY_BRIEF_COUNT) {
  const [run] = await db.insert(rtmRuns).values({ status: "running" }).returning();

  try {
    const existing = await db.select({ url: rtmNewsItems.url }).from(rtmNewsItems);
    const existingUrls = new Set(existing.map((row) => row.url));

    const byUrl = new Map<string, Candidate>();
    const feedErrors: string[] = [];

    // Search Google News for each topic and collect on-topic, not-yet-seen items.
    for (const q of RTM_SEARCH_QUERIES) {
      try {
        const items = await fetchRssItems(googleNewsRssUrl(q.query));
        for (const item of items) {
          if (existingUrls.has(item.link) || byUrl.has(item.link)) continue;
          const haystack = `${item.title} ${item.description ?? ""}`;
          const matchedKeywords = textMatchesKeywords(haystack);
          if (matchedKeywords.length === 0) continue;

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

    const candidates = [...byUrl.values()];

    // Rank by relevance (keyword hits, then recency) and keep only the top N -
    // this is a curated daily shortlist, not an ever-growing feed.
    const ranked = candidates
      .map((candidate) => {
        const parsedDate = parsePubDate(candidate.pubDate);
        return { candidate, parsedDate, score: relevanceScore(candidate.matchedKeywords, parsedDate) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, dailyCount);

    const model = getBriefModel();
    let briefsGenerated = 0;
    let rank = 0;

    for (const { candidate, parsedDate } of ranked) {
      // Generate the brief FIRST, and only persist the item + brief if it
      // succeeds. That way a transient AI failure doesn't permanently "use up"
      // the news item (it can be picked again on the next scan).
      let brief;
      try {
        brief = await generateRtmBrief({
          source: candidate.source,
          title: candidate.title,
          summary: candidate.description,
        });
      } catch (err) {
        feedErrors.push(
          `בריף עבור "${candidate.title}": ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }

      const [newsRow] = await db
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
        .onConflictDoNothing()
        .returning();
      if (!newsRow) continue;

      rank += 1;
      await db.insert(rtmBriefs).values({
        newsItemId: newsRow.id,
        rank,
        whatHappened: brief.whatHappened,
        meaningForMortgageHolders: brief.meaningForMortgageHolders,
        closingQuestion: brief.closingQuestion,
        aiModel: model,
      });
      briefsGenerated += 1;
    }

    await db
      .update(rtmRuns)
      .set({
        status: "success",
        itemsFound: candidates.length,
        briefsGenerated,
        feedErrors,
      })
      .where(eq(rtmRuns.id, run.id));

    return { itemsFound: candidates.length, briefsGenerated, feedErrors };
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
