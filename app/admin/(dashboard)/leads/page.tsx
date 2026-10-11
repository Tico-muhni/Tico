import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import LeadsBoard, { type LeadRow } from "./leads-board";

export const metadata = { title: "לידים | Tico" };

export default async function LeadsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");

  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.createdAt));

  const initial: LeadRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    source: r.source,
    medium: r.medium,
    campaign: r.campaign,
    groupName: r.groupName,
    postUrl: r.postUrl,
    topic: r.topic,
    type: r.type,
    stage: r.stage,
    nextStep: r.nextStep,
    nextAt: r.nextAt ? r.nextAt.toISOString() : null,
    value: r.value,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));

  return <LeadsBoard initial={initial} />;
}
