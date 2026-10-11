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

/** Exports one page from Canva, stores it, writes a caption with Gemini and adds a draft for approval. */
export async function createDraftFromCanvaAction(input: {
  designId: string;
  page: number;
  title: string;
  description: string;
  platform: "facebook" | "instagram" | "both";
}): Promise<{ ok: true } | Fail> {
  const userId = await currentUserId();
  if (!userId) return fail(new Error("לא מחובר"));
  try {
    const url = await exportDesignPage(userId, input.designId, input.page);
    const res = await fetch(url);
    if (!res.ok) throw new Error("הורדת התמונה מקנבה נכשלה");
    // Canva's download link expires after 24h, so keep our own copy.
    const imageUrl = await uploadGeneratedImage(Buffer.from(await res.arrayBuffer()), "image/png");

    const desc = input.description.trim() || input.title || "פוסט שיווקי בנושא משכנתאות";
    const captions = await generateHumanizedCaption(desc);

    await db.insert(draftPosts).values({
      platform: input.platform,
      aiCaptionFacebook: captions.captionFacebook,
      aiCaptionInstagram: captions.captionInstagram,
      hashtags: captions.hashtags,
      imageUrl,
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
