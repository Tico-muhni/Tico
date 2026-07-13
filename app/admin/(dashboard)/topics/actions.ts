"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { topics } from "@/drizzle/schema";
import { runContentGeneration } from "@/lib/generate-content";

export async function addTopicAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "יש להזין נושא" };

  await db.insert(topics).values({ title, source: "manual" });
  revalidatePath("/admin/topics");
  return { error: null };
}

export async function generateNowAction(
  _prevState: { error: string | null; success: string | null },
  formData: FormData
): Promise<{ error: string | null; success: string | null }> {
  const countRaw = formData.get("count");
  const count = countRaw ? Number(countRaw) : undefined;

  try {
    const result = await runContentGeneration(count);
    revalidatePath("/admin/topics");
    revalidatePath("/admin/drafts");
    return {
      error: null,
      success: `נוצרו ${result.postsGenerated} טיוטות פוסט ו-${result.emailsGenerated} טיוטות מייל`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "שגיאה ביצירת תוכן",
      success: null,
    };
  }
}
