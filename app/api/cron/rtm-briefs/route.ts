import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { scanForCandidates } from "@/lib/generate-rtm-briefs";

export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scanning is free (no AI), so refresh every advisor's candidate list daily.
  const allUsers = await db.select({ id: users.id }).from(users);
  const results: { userId: string; ok: boolean; error?: string }[] = [];

  for (const user of allUsers) {
    try {
      await scanForCandidates(user.id);
      results.push({ userId: user.id, ok: true });
    } catch (err) {
      results.push({
        userId: user.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, scanned: results.length, results });
}
