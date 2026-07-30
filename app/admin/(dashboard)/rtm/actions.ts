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

    const warnings =
      result.feedErrors.length > 0
        ? ` (שימו לב: ${result.feedErrors.join("; ")})`
        : "";

    return {
      error: null,
      success: `נמצאו ${result.itemsFound} ידיעות רלוונטיות חדשות, נוצרו ${result.briefsGenerated} בריפים.${warnings}`,
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
