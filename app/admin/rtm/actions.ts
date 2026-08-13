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

type ActionResult = { error: string | null; success: string | null };

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
  newsItemId: string
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
    await generateBriefForNewsItem(user.id, newsItemId, user.geminiApiKey);
    revalidatePath("/admin/rtm");
    return { error: null, success: null };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const quotaHit = /429|quota|resource_exhausted/i.test(raw);
    return {
      error: quotaHit
        ? "המכסה היומית החינמית של ה-AI נוצלה — נסו שוב מאוחר יותר או מחר (המכסה מתאפסת כל יום)."
        : "יצירת הבריף נכשלה — אפשר לנסות שוב.",
      success: null,
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
