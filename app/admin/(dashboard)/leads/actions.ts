"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import { leadInputSchema, leadPatchSchema } from "@/lib/leads";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export async function createLeadAction(input: unknown): Promise<Result<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "לא מחובר" };
  const p = leadInputSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "הנתונים אינם תקינים" };
  const l = p.data;
  const [row] = await db
    .insert(leads)
    .values({
      userId,
      name: l.name,
      phone: clean(l.phone),
      source: l.source || "manual",
      medium: clean(l.medium),
      campaign: clean(l.campaign),
      groupName: clean(l.groupName),
      postUrl: clean(l.postUrl),
      topic: clean(l.topic),
      type: l.type ?? "other",
      stage: l.stage ?? "found",
      nextStep: clean(l.nextStep),
      nextAt: l.nextAt ? new Date(l.nextAt) : null,
      value: l.value ?? null,
      notes: l.notes ?? "",
    })
    .returning({ id: leads.id });
  return { ok: true, id: row.id };
}

export async function updateLeadAction(id: string, patch: unknown): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "לא מחובר" };
  const p = leadPatchSchema.safeParse(patch);
  if (!p.success) return { ok: false, error: "הנתונים אינם תקינים" };
  const l = p.data;

  const set: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (l.name !== undefined) set.name = l.name;
  if (l.phone !== undefined) set.phone = clean(l.phone);
  if (l.source !== undefined) set.source = l.source || "manual";
  if (l.medium !== undefined) set.medium = clean(l.medium);
  if (l.campaign !== undefined) set.campaign = clean(l.campaign);
  if (l.groupName !== undefined) set.groupName = clean(l.groupName);
  if (l.postUrl !== undefined) set.postUrl = clean(l.postUrl);
  if (l.topic !== undefined) set.topic = clean(l.topic);
  if (l.type !== undefined) set.type = l.type;
  if (l.stage !== undefined) set.stage = l.stage;
  if (l.nextStep !== undefined) set.nextStep = clean(l.nextStep);
  if (l.nextAt !== undefined) set.nextAt = l.nextAt ? new Date(l.nextAt) : null;
  if (l.value !== undefined) set.value = l.value;
  if (l.notes !== undefined) set.notes = l.notes;

  await db.update(leads).set(set).where(and(eq(leads.id, id), eq(leads.userId, userId)));
  return { ok: true };
}

export async function deleteLeadAction(id: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "לא מחובר" };
  await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
  return { ok: true };
}
