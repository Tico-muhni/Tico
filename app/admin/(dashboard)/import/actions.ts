"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { draftPosts } from "@/drizzle/schema";
import { uploadDraftImage } from "@/lib/blob";
import { generateHumanizedCaption } from "@/lib/humanize-caption";
import { getContentModel } from "@/lib/anthropic";

type ImportResult = {
  error: string | null;
  progress: { current: number; total: number } | null;
  summary: { imported: number; failed: number; errors: string[] } | null;
};

const MAX_FILES = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function bulkImportAction(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const files = formData.getAll("images") as File[];
  const platform = (formData.get("platform") as string) || "both";
  const descriptions = formData.get("descriptions") as string | null;

  if (!files.length || (files.length === 1 && files[0].size === 0)) {
    return { error: "יש להעלות לפחות תמונה אחת", progress: null, summary: null };
  }

  if (files.length > MAX_FILES) {
    return {
      error: `ניתן להעלות עד ${MAX_FILES} תמונות בפעם אחת`,
      progress: null,
      summary: null,
    };
  }

  const descMap = parseDescriptions(descriptions);

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: סוג קובץ לא נתמך (${file.type})`);
      failed++;
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: הקובץ גדול מדי (מקסימום 10MB)`);
      failed++;
      continue;
    }

    try {
      const imageUrl = await uploadDraftImage(file);

      const desc =
        descMap.get(file.name) ||
        descMap.get(stripExtension(file.name)) ||
        guessTopicFromFilename(file.name);

      const captions = await generateHumanizedCaption(desc);

      await db.insert(draftPosts).values({
        platform: platform as "facebook" | "instagram" | "both",
        aiCaptionFacebook: captions.captionFacebook,
        aiCaptionInstagram: captions.captionInstagram,
        hashtags: captions.hashtags,
        imageUrl,
        imageSource: "manual_upload",
        aiModel: getContentModel(),
        status: "pending_review",
      });

      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      errors.push(`${file.name}: ${msg}`);
      failed++;
    }
  }

  revalidatePath("/admin/drafts");
  revalidatePath("/admin/import");

  return {
    error: null,
    progress: null,
    summary: { imported, failed, errors },
  };
}

function parseDescriptions(raw: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separatorIdx = trimmed.indexOf(":");
    if (separatorIdx > 0) {
      const filename = trimmed.slice(0, separatorIdx).trim();
      const desc = trimmed.slice(separatorIdx + 1).trim();
      if (filename && desc) {
        map.set(filename, desc);
        map.set(stripExtension(filename), desc);
      }
    }
  }
  return map;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function guessTopicFromFilename(filename: string): string {
  const name = stripExtension(filename)
    .replace(/[-_]/g, " ")
    .replace(/\d+/g, "")
    .trim();
  return name || "פוסט שיווקי בנושא משכנתאות";
}
