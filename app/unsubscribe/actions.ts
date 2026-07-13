"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/drizzle/schema";

export async function confirmUnsubscribeAction(token: string) {
  const subscriber = await db.query.subscribers.findFirst({
    where: eq(subscribers.unsubscribeToken, token),
  });
  if (!subscriber) return { ok: false as const };

  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.id, subscriber.id));

  return { ok: true as const, email: subscriber.email };
}
