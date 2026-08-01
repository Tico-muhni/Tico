"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rtmBriefs } from "@/drizzle/schema";
import {
  scanForCandidates,
  generateBriefForNewsItem,
} from "@/lib/generate-rtm-briefs";

type ActionResult = { error: string | null; success: string | null };

export async function scanNewsAction(): Promise<ActionResult> {
  try {
    const result = await scanForCandidates();
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
  try {
    await generateBriefForNewsItem(newsItemId);
    revalidatePath("/admin/rtm");
    return { error: null, success: null };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const quotaHit =
      /429|quota|resource_exhausted/i.test(raw);
    return {
      error: quotaHit
        ? "המכסה היומית החינמית של ה-AI נוצלה — נסו שוב מאוחר יותר או מחר (המכסה מתאפסת כל יום)."
        : "יצירת הבריף נכשלה — אפשר לנסות שוב.",
      success: null,
    };
  }
}

export async function setRtmBriefStatusAction(
  id: string,
  status: "approved" | "dismissed"
) {
  await db.update(rtmBriefs).set({ status }).where(eq(rtmBriefs.id, id));
  revalidatePath("/admin/rtm");
}
