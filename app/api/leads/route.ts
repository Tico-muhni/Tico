import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, lte, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leads, users } from "@/drizzle/schema";
import { LEAD_STAGES, leadInputSchema } from "@/lib/leads";

// Intake for scheduled scanners and forms. Authenticated with a shared secret
// (LEADS_API_TOKEN); the leads belong to the advisor named in LEADS_API_USER_EMAIL.

function authorized(req: NextRequest): boolean {
  const secret = process.env.LEADS_API_TOKEN;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function ownerId(): Promise<string | null> {
  const email = process.env.LEADS_API_USER_EMAIL?.toLowerCase().trim();
  if (!email) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return u?.id ?? null;
}

const bodySchema = z.union([
  leadInputSchema,
  z.object({ leads: z.array(leadInputSchema).min(1).max(100) }),
]);

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await ownerId();
  if (!userId) return NextResponse.json({ error: "LEADS_API_USER_EMAIL is not set or unknown" }, { status: 500 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const items = "leads" in parsed.data ? parsed.data.leads : [parsed.data];

  const rows = items.map((l) => ({
    userId,
    name: l.name,
    phone: l.phone || null,
    source: l.source || "manual",
    medium: l.medium || null,
    campaign: l.campaign || null,
    groupName: l.groupName || null,
    postUrl: l.postUrl || null,
    topic: l.topic || null,
    type: l.type ?? "other",
    stage: l.stage ?? "found",
    nextStep: l.nextStep || null,
    nextAt: l.nextAt ? new Date(l.nextAt) : null,
    value: l.value ?? null,
    notes: l.notes ?? "",
    externalKey: l.externalKey || null,
  }));

  // A repeated externalKey is skipped, so a rerun never overwrites what was edited in the app.
  const inserted = await db
    .insert(leads)
    .values(rows)
    .onConflictDoNothing({ target: [leads.userId, leads.externalKey] })
    .returning({ id: leads.id });

  return NextResponse.json({ ok: true, created: inserted.length, skipped: rows.length - inserted.length });
}

/** List leads, so a scanner can avoid duplicates or pick up follow-ups. `?due=1` = next step is due. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await ownerId();
  if (!userId) return NextResponse.json({ error: "LEADS_API_USER_EMAIL is not set or unknown" }, { status: 500 });

  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const conds = [eq(leads.userId, userId)];
  if (stage && (LEAD_STAGES as readonly string[]).includes(stage)) {
    conds.push(inArray(leads.stage, [stage as (typeof LEAD_STAGES)[number]]));
  }
  if (url.searchParams.get("due") === "1") {
    conds.push(lte(leads.nextAt, new Date()), notInArray(leads.stage, ["client", "lost"]));
  }
  const rows = await db
    .select()
    .from(leads)
    .where(and(...conds))
    .orderBy(desc(leads.createdAt))
    .limit(200);
  return NextResponse.json({ leads: rows });
}
