"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  chatbotTriggers,
  chatbotSettings,
  chatbotConversations,
} from "@/drizzle/schema";

type ActionResult = { error: string | null; success: string | null };

export async function createTriggerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const keyword = String(formData.get("keyword") ?? "").trim();
  const replyTemplate = String(formData.get("replyTemplate") ?? "").trim();
  const action = String(formData.get("action") ?? "send_dm") as
    | "send_dm"
    | "reply_comment"
    | "both";

  if (!keyword || !replyTemplate) {
    return { error: "מילת מפתח ותבנית תגובה הם שדות חובה", success: null };
  }

  const existing = await db.query.chatbotTriggers.findFirst({
    where: eq(chatbotTriggers.keyword, keyword),
  });
  if (existing) {
    return { error: `מילת המפתח "${keyword}" כבר קיימת`, success: null };
  }

  await db.insert(chatbotTriggers).values({ keyword, replyTemplate, action });
  revalidatePath("/admin/chatbot");
  return { error: null, success: "הטריגר נוצר בהצלחה" };
}

export async function updateTriggerAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const replyTemplate = String(formData.get("replyTemplate") ?? "").trim();
  const action = String(formData.get("action") ?? "send_dm") as
    | "send_dm"
    | "reply_comment"
    | "both";
  const active = formData.get("active") === "on";

  if (!replyTemplate) {
    return { error: "תבנית תגובה היא שדה חובה", success: null };
  }

  await db
    .update(chatbotTriggers)
    .set({ replyTemplate, action, active })
    .where(eq(chatbotTriggers.id, id));

  revalidatePath("/admin/chatbot");
  return { error: null, success: "הטריגר עודכן" };
}

export async function deleteTriggerAction(id: string) {
  await db.delete(chatbotTriggers).where(eq(chatbotTriggers.id, id));
  revalidatePath("/admin/chatbot");
}

export async function updateSettingsAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const aiSmartRepliesEnabled = formData.get("aiSmartRepliesEnabled") === "on";
  const storyAutoReplyEnabled = formData.get("storyAutoReplyEnabled") === "on";
  const commentToDmEnabled = formData.get("commentToDmEnabled") === "on";
  const storyAutoReplyTemplate = String(
    formData.get("storyAutoReplyTemplate") ?? ""
  ).trim();

  const settings = await db.query.chatbotSettings.findFirst();

  if (settings) {
    await db
      .update(chatbotSettings)
      .set({
        aiSmartRepliesEnabled,
        storyAutoReplyEnabled,
        commentToDmEnabled,
        storyAutoReplyTemplate:
          storyAutoReplyTemplate || settings.storyAutoReplyTemplate,
        updatedAt: new Date(),
      })
      .where(eq(chatbotSettings.id, settings.id));
  } else {
    await db.insert(chatbotSettings).values({
      aiSmartRepliesEnabled,
      storyAutoReplyEnabled,
      commentToDmEnabled,
      ...(storyAutoReplyTemplate ? { storyAutoReplyTemplate } : {}),
    });
  }

  revalidatePath("/admin/chatbot");
  return { error: null, success: "ההגדרות עודכנו" };
}

export async function updateConversationStatusAction(
  id: string,
  status: "active" | "resolved" | "escalated"
) {
  await db
    .update(chatbotConversations)
    .set({ status })
    .where(eq(chatbotConversations.id, id));
  revalidatePath("/admin/chatbot");
}
