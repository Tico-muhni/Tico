"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { draftPosts } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import {
  exportDesignPage,
  getDesignPages,
  listFolderItems,
  searchDesigns,
  type CanvaItem,
  type CanvaPage,
} from "@/lib/canva";
import { uploadGeneratedImage } from "@/lib/blob";
import { generateHumanizedCaption } from "@/lib/humanize-caption";
import { getContentModel } from "@/lib/anthropic";

type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({ ok: false, error: e instanceof Error ? e.message : "שגיאה לא ידועה" });

export async function browseCanvaAction(
  input: { folderId?: string; query?: string; continuation?: string },
): Promise<{ ok: true; items: CanvaItem[]; continuation?: string } | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail(new Error("לא מחובר"));
  try {
    const q = input.query?.trim();
    const r = q
      ? await searchDesigns(userId, q, input.continuation)
      : await listFolderItems(userId, input.folderId || "root", input.continuation);
    return { ok: true, ...r };
  } catch (e) {
    return fail(e);
  }
}

export async function designPagesAction(designId: string): Promise<{ ok: true; pages: CanvaPage[] } | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail(new Error("לא מחובר"));
  try {
    return { ok: true, pages: await getDesignPages(userId, designId) };
  } catch (e) {
    return fail(e);
  }
}

/** Exports one page from Canva and keeps our own copy (Canva's link expires after 24h). */
export async function exportCanvaPageAction(input: {
  designId: string;
  page: number;
}): Promise<{ ok: true; imageUrl: string } | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail(new Error("לא מחובר"));
  try {
    const url = await exportDesignPage(userId, input.designId, input.page);
    const res = await fetch(url);
    if (!res.ok) throw new Error("הורדת התמונה מקנבה נכשלה");
    const imageUrl = await uploadGeneratedImage(Buffer.from(await res.arrayBuffer()), "image/png");
    return { ok: true, imageUrl };
  } catch (e) {
    return fail(e);
  }
}

/** One draft for approval: a carousel when there are several images, else a single-image post. */
export async function createCanvaDraftAction(input: {
  imageUrls: string[];
  title: string;
  description: string;
  platform: "facebook" | "instagram" | "both";
}): Promise<{ ok: true } | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail(new Error("לא מחובר"));
  if (input.imageUrls.length === 0) return fail(new Error("אין תמונות"));
  if (input.imageUrls.length > 10) return fail(new Error("קרוסלה יכולה להכיל עד 10 תמונות"));
  try {
    const desc = input.description.trim() || input.title || "פוסט שיווקי בנושא משכנתאות";
    const carousel = input.imageUrls.length > 1;
    const captions = await generateHumanizedCaption(
      carousel ? `${desc} (קרוסלה של ${input.imageUrls.length} שקפים)` : desc,
    );

    await db.insert(draftPosts).values({
      platform: input.platform,
      aiCaptionFacebook: captions.captionFacebook,
      aiCaptionInstagram: captions.captionInstagram,
      hashtags: captions.hashtags,
      imageUrl: input.imageUrls[0],
      imageUrls: carousel ? input.imageUrls : [],
      imageSource: "canva",
      aiModel: getContentModel(),
      status: "pending_review",
    });
    revalidatePath("/admin/drafts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
