import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmNewsItems, rtmBriefs, rtmRuns } from "@/drizzle/schema";
import { RTM_NEWS_FEEDS, textMatchesKeywords } from "@/lib/rtm-news-sources";
import { fetchRssItems } from "@/lib/rtm-rss";
import { generateRtmBrief } from "@/lib/rtm-brief";
import { getContentModel } from "@/lib/anthropic";
import type { RtmSource } from "@/lib/rtm-news-sources";

// How many ranked briefs to produce per daily scan - a fixed, curated
// shortlist rather than an open-ended list of everything that matched.
const DAILY_BRIEF_COUNT = 3;

type Candidate = {
  source: RtmSource;
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

function relevanceScore(candidate: Candidate, parsedDate: Date | null): number {
  const keywordScore = candidate.matchedKeywords.length * 1000;
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

    const candidates: Candidate[] = [];
    const feedErrors: string[] = [];

    for (const feed of RTM_NEWS_FEEDS) {
      try {
        const items = await fetchRssItems(feed.url);
        for (const item of items) {
          if (existingUrls.has(item.link)) continue;
          const haystack = `${item.title} ${item.description ?? ""}`;
          const matchedKeywords = textMatchesKeywords(haystack);
          if (matchedKeywords.length === 0) continue;

          candidates.push({
            source: feed.source,
            title: item.title,
            url: item.link,
            description: item.description,
            pubDate: item.pubDate,
            matchedKeywords,
          });
        }
      } catch (err) {
        feedErrors.push(
          `${feed.label}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Rank by relevance (keyword hits, then recency) and keep only the
    // top N - this is a curated daily shortlist, not an ever-growing feed.
    const ranked = candidates
      .map((candidate) => {
        const parsedDate = parsePubDate(candidate.pubDate);
        return { candidate, parsedDate, score: relevanceScore(candidate, parsedDate) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, dailyCount);

    const model = getContentModel();
    let briefsGenerated = 0;
    let rank = 0;

    for (const { candidate, parsedDate } of ranked) {
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

      try {
        const brief = await generateRtmBrief({
          source: candidate.source,
          title: candidate.title,
          summary: candidate.description,
        });

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
      } catch (err) {
        feedErrors.push(
          `בריף עבור "${candidate.title}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
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
