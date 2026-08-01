"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rtmBriefs } from "@/drizzle/schema";
import { runRtmBriefGeneration } from "@/lib/generate-rtm-briefs";

type ActionResult = { error: string | null; success: string | null };

export async function generateRtmNowAction(): Promise<ActionResult> {
  try {
    const result = await runRtmBriefGeneration();
    revalidatePath("/admin/rtm");

    // Turn the raw feed/AI errors into one short, human note - never dump the
    // raw API error text into the UI.
    const errorsText = result.feedErrors.join(" ").toLowerCase();
    const quotaHit =
      errorsText.includes("429") ||
      errorsText.includes("quota") ||
      errorsText.includes("resource_exhausted");

    let note = "";
    if (quotaHit) {
      note =
        " המכסה היומית החינמית של ה-AI נוצלה, אז חלק מהבריפים לא נוצרו — המכסה מתאפסת כל יום, נסו שוב מאוחר יותר או מחר.";
    } else if (result.feedErrors.length > 0) {
      note = " חלק מהבריפים לא נוצרו בגלל תקלה זמנית — אפשר לנסות שוב.";
    }

    return {
      error: null,
      success: `נמצאו ${result.itemsFound} כתבות רלוונטיות, נוצרו ${result.briefsGenerated} בריפים.${note}`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "שגיאה בסריקת החדשות",
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
