import { NextRequest, NextResponse } from "next/server";
import { and, desc, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();

  // Determine whose briefs to return. A logged-in advisor gets their own; an
  // automation caller uses the shared secret plus an explicit ?userId=.
  let userId: string | null = session?.user?.id ?? null;
  if (!userId) {
    const secret = process.env.RTM_API_SECRET;
    const authHeader = req.headers.get("authorization");
    if (secret && authHeader === `Bearer ${secret}`) {
      userId = req.nextUrl.searchParams.get("userId");
    }
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 100);

  const rows = await db
    .select({
      id: rtmBriefs.id,
      whatHappened: rtmBriefs.whatHappened,
      meaningForMortgageHolders: rtmBriefs.meaningForMortgageHolders,
      closingQuestion: rtmBriefs.closingQuestion,
      status: rtmBriefs.status,
      generatedAt: rtmBriefs.generatedAt,
      source: rtmNewsItems.source,
      title: rtmNewsItems.title,
      url: rtmNewsItems.url,
      publishedAt: rtmNewsItems.publishedAt,
    })
    .from(rtmBriefs)
    .innerJoin(rtmNewsItems, eq(rtmBriefs.newsItemId, rtmNewsItems.id))
    .leftJoin(rtmRuns, eq(rtmNewsItems.runId, rtmRuns.id))
    .where(and(eq(rtmBriefs.userId, userId), eq(rtmBriefs.status, "approved")))
    .orderBy(desc(rtmRuns.runAt), asc(rtmBriefs.rank))
    .limit(limit);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    brand: { primary: "#2E8B57", dark: "#0F243E", accent: "#D4AF37" },
    items: rows.map((row) => ({
      id: row.id,
      source: row.source,
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
