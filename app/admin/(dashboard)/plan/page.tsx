import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { planEntries, planSettings } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import { planSettingsSchema } from "@/lib/business-plan/schemas";
import type {
  ActionEntry,
  DayEntry,
  ExpenseEntry,
  PlanData,
} from "@/lib/business-plan/types";
import PlanClient from "./plan-client";
import "./plan.css";

export const metadata = { title: "תוכנית עסקית | Tico" };

export default async function PlanPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");

  const [settingsRow] = await db
    .select()
    .from(planSettings)
    .where(eq(planSettings.userId, userId))
    .limit(1);
  const entries = await db
    .select()
    .from(planEntries)
    .where(eq(planEntries.userId, userId));

  // Stored settings are re-validated; anything that no longer fits falls back to the defaults.
  const parsed = settingsRow ? planSettingsSchema.safeParse(settingsRow.data) : null;

  const initial: PlanData = {
    settings: parsed?.success ? parsed.data : null,
    days: {},
    actions: {},
    expenses: {},
  };
  for (const e of entries) {
    if (e.kind === "day") initial.days[e.key] = e.data as unknown as DayEntry;
    else if (e.kind === "action") initial.actions[e.key] = e.data as unknown as ActionEntry;
    else initial.expenses[e.key] = e.data as unknown as ExpenseEntry;
  }

  return <PlanClient initial={initial} />;
}
