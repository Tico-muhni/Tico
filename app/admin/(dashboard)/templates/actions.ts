"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { imageTemplates } from "@/drizzle/schema";
import { uploadDraftImage } from "@/lib/blob";

type ActionResult = { error: string | null };

export async function uploadTemplateAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const label = String(formData.get("label") ?? "").trim();
  const file = formData.get("image");
  const textZoneRaw = String(formData.get("textZone") ?? "bottom");
  const textColorRaw = String(formData.get("textColor") ?? "light");
  const textZone = ["bottom", "top", "left", "right"].includes(textZoneRaw)
    ? (textZoneRaw as "bottom" | "top" | "left" | "right")
    : "bottom";
  const textColor = textColorRaw === "dark" ? "dark" : "light";

  if (!label) return { error: "יש לתת שם לתבנית" };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "יש לבחור תמונה" };
  }

  const imageUrl = await uploadDraftImage(file);
  await db.insert(imageTemplates).values({ label, imageUrl, textZone, textColor });

  revalidatePath("/admin/templates");
  return { error: null };
}

export async function toggleTemplateActiveAction(id: string, active: boolean) {
  await db.update(imageTemplates).set({ active }).where(eq(imageTemplates.id, id));
  revalidatePath("/admin/templates");
}

export async function deleteTemplateAction(id: string) {
  await db.delete(imageTemplates).where(eq(imageTemplates.id, id));
  revalidatePath("/admin/templates");
}
