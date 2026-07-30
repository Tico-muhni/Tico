import { NextRequest, NextResponse } from "next/server";
import { desc, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import { RTM_SOURCE_LABEL } from "@/lib/rtm-news-sources";
import { auth } from "@/lib/auth";

function isAuthorized(req: NextRequest, hasSession: boolean) {
  if (hasSession) return true;
  const secret = process.env.RTM_API_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!isAuthorized(req, !!session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Default: just today's ranked shortlist (one run's worth). Pass ?limit=
  // to pull more rows further back in history.
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 3, 1), 100);

  const rows = await db
    .select({
      id: rtmBriefs.id,
      rank: rtmBriefs.rank,
      whatHappened: rtmBriefs.whatHappened,
      meaningForMortgageHolders: rtmBriefs.meaningForMortgageHolders,
      closingQuestion: rtmBriefs.closingQuestion,
      status: rtmBriefs.status,
      generatedAt: rtmBriefs.generatedAt,
      source: rtmNewsItems.source,
      title: rtmNewsItems.title,
      url: rtmNewsItems.url,
      publishedAt: rtmNewsItems.publishedAt,
      runAt: rtmRuns.runAt,
    })
    .from(rtmBriefs)
    .innerJoin(rtmNewsItems, eq(rtmBriefs.newsItemId, rtmNewsItems.id))
    .leftJoin(rtmRuns, eq(rtmNewsItems.runId, rtmRuns.id))
    .orderBy(desc(rtmRuns.runAt), asc(rtmBriefs.rank))
    .limit(limit);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    brand: {
      primary: "#2E8B57",
      dark: "#0F243E",
      accent: "#D4AF37",
    },
    items: rows.map((row) => ({
      id: row.id,
      rank: row.rank,
      source: row.source,
      sourceLabel: RTM_SOURCE_LABEL[row.source],
      title: row.title,
      url: row.url,
      publishedAt: row.publishedAt,
      whatHappened: row.whatHappened,
      meaningForMortgageHolders: row.meaningForMortgageHolders,
      closingQuestion: row.closingQuestion,
      status: row.status,
      generatedAt: row.generatedAt,
    })),
  });
}
