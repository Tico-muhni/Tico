import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmNewsItems, rtmBriefs, rtmRuns } from "@/drizzle/schema";
import { RTM_NEWS_FEEDS, textMatchesKeywords } from "@/lib/rtm-news-sources";
import { fetchRssItems } from "@/lib/rtm-rss";
import { generateRtmBrief } from "@/lib/rtm-brief";
import { getContentModel } from "@/lib/anthropic";
import type { RtmSource } from "@/lib/rtm-news-sources";

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

export async function runRtmBriefGeneration(maxNewItems = 8) {
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

    const toProcess = candidates.slice(0, maxNewItems);
    const model = getContentModel();
    let briefsGenerated = 0;

    for (const candidate of toProcess) {
      const [newsRow] = await db
        .insert(rtmNewsItems)
        .values({
          source: candidate.source,
          title: candidate.title,
          url: candidate.url,
          summary: candidate.description,
          publishedAt: parsePubDate(candidate.pubDate),
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

        await db.insert(rtmBriefs).values({
          newsItemId: newsRow.id,
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
