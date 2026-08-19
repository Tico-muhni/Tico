"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems } from "@/drizzle/schema";
import { currentUser } from "@/lib/auth";
import {
  scanForCandidates,
  generateBriefForNewsItem,
} from "@/lib/generate-rtm-briefs";
import { generateSocialPost, type BriefStyle } from "@/lib/rtm-brief";

type ActionResult = {
  error: string | null;
  success: string | null;
  quota?: boolean;
};

// Shown when the advisor's free Gemini key hits its daily request limit. It's
// not a bug, so the message reassures and says what to do.
const QUOTA_MESSAGE =
  "נגמרה המכסה החינמית של Gemini להיום. זו לא תקלה — המפתח החינמי הגיע לתקרת הבקשות היומית. אפשר לנסות שוב מחר (המכסה מתאפסת אוטומטית), או ליצור מפתח Gemini חדש בחינם ולעדכן אותו.";

// The Gemini free tier signals an exhausted quota with 429 / RESOURCE_EXHAUSTED.
function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /429|quota|resource_exhausted/i.test(raw);
}

export async function scanNewsAction(): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { error: "יש להתחבר מחדש", success: null };

  try {
    const result = await scanForCandidates(user.id);
    revalidatePath("/admin/rtm");

    if (result.candidatesFound === 0) {
      return {
        error: null,
        success: "לא נמצאו כתבות רלוונטיות כרגע — נסו שוב מאוחר יותר.",
      };
    }
    return {
      error: null,
      success: `נמצאו ${result.candidatesFound} כתבות — בחרו מהן ולחצו "צור בריף".`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "שגיאה בסריקת החדשות",
      success: null,
    };
  }
}

export async function generateBriefAction(
  newsItemId: string,
  style: BriefStyle = "article"
): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { error: "יש להתחבר מחדש", success: null };
  if (!user.geminiApiKey) {
    return {
      error: "אין מפתח Gemini בחשבון — עדכנו אותו כדי ליצור בריפים.",
      success: null,
    };
  }

  try {
    await generateBriefForNewsItem(user.id, newsItemId, user.geminiApiKey, style);
    revalidatePath("/admin/rtm");
    return { error: null, success: null };
  } catch (err) {
    const quotaHit = isQuotaError(err);
    return {
      error: quotaHit ? QUOTA_MESSAGE : "יצירת הבריף נכשלה — אפשר לנסות שוב.",
      success: null,
      quota: quotaHit,
    };
  }
}

/**
 * Remove an article from the board. Deleting the news item cascades to its
 * brief (if one was already made), so this clears the whole card. Scoped to
 * the current advisor so one user can't delete another's items.
 */
export async function deleteNewsItemAction(newsItemId: string) {
  const user = await currentUser();
  if (!user) return;
  await db
    .delete(rtmNewsItems)
    .where(
      and(eq(rtmNewsItems.id, newsItemId), eq(rtmNewsItems.userId, user.id))
    );
  revalidatePath("/admin/rtm");
}

/**
 * Adapt an existing brief into a ready-to-paste WhatsApp/Facebook post. Runs on
 * demand (the result isn't stored), scoped to the current advisor.
 */
export async function generateSocialPostAction(
  briefId: string
): Promise<{ text: string | null; error: string | null; quota?: boolean }> {
  const user = await currentUser();
  if (!user) return { text: null, error: "יש להתחבר מחדש" };
  if (!user.geminiApiKey) {
    return { text: null, error: "אין מפתח Gemini בחשבון — עדכנו אותו." };
  }

  const [brief] = await db
    .select({
      whatHappened: rtmBriefs.whatHappened,
      meaningForMortgageHolders: rtmBriefs.meaningForMortgageHolders,
      closingQuestion: rtmBriefs.closingQuestion,
    })
    .from(rtmBriefs)
    .where(and(eq(rtmBriefs.id, briefId), eq(rtmBriefs.userId, user.id)))
    .limit(1);
  if (!brief) return { text: null, error: "הבריף לא נמצא" };

  try {
    const text = await generateSocialPost(brief, user.geminiApiKey);
    return { text, error: null };
  } catch (err) {
    const quotaHit = isQuotaError(err);
    return {
      text: null,
      error: quotaHit ? QUOTA_MESSAGE : "יצירת הפוסט נכשלה — אפשר לנסות שוב.",
      quota: quotaHit,
    };
  }
}

export async function setRtmBriefStatusAction(
  id: string,
  status: "approved" | "dismissed"
) {
  const user = await currentUser();
  if (!user) return;
  await db
    .update(rtmBriefs)
    .set({ status })
    .where(and(eq(rtmBriefs.id, id), eq(rtmBriefs.userId, user.id)));
  revalidatePath("/admin/rtm");
}
