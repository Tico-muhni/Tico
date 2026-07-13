import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  topics,
  draftPosts,
  draftEmails,
  generationRuns,
  imageTemplates,
} from "@/drizzle/schema";
import { generateDraftForTopic, getContentModel } from "@/lib/anthropic";
import { SEED_TOPICS } from "@/lib/seed-topics";
import { renderPostImage } from "@/lib/image-template";
import { uploadGeneratedImage } from "@/lib/blob";

async function pickRandomActiveTemplate() {
  const active = await db
    .select()
    .from(imageTemplates)
    .where(eq(imageTemplates.active, true));
  if (active.length === 0) return null;
  return active[Math.floor(Math.random() * active.length)];
}

async function tryAutoRenderImage(overlay: {
  overlayHook: string;
  overlayCta: string;
  overlayClosing: string;
}) {
  const template = await pickRandomActiveTemplate();
  if (!template) return null;

  try {
    const buffer = await renderPostImage({
      backgroundUrl: template.imageUrl,
      ...overlay,
      textZone: template.textZone,
      textColor: template.textColor,
    });
    const url = await uploadGeneratedImage(buffer);
    return url;
  } catch (err) {
    // A rendering/upload failure shouldn't block the whole draft - it just
    // falls back to the existing "upload an image manually" flow in the
    // approval dashboard.
    console.error("Auto image render failed:", err);
    return null;
  }
}

async function ensureSeedTopics() {
  const existing = await db.select({ title: topics.title }).from(topics);
  const existingTitles = new Set(existing.map((t) => t.title));
  const missing = SEED_TOPICS.filter((t) => !existingTitles.has(t));
  if (missing.length > 0) {
    await db
      .insert(topics)
      .values(missing.map((title) => ({ title, source: "seed" as const })));
  }
}

async function pickTopics(count: number) {
  return db
    .select()
    .from(topics)
    .where(eq(topics.status, "pending"))
    .limit(count);
}

export async function runContentGeneration(count?: number) {
  const n = count ?? Number(process.env.POSTS_PER_WEEK || 2);
  const [run] = await db
    .insert(generationRuns)
    .values({ status: "running" })
    .returning();

  try {
    await ensureSeedTopics();
    const picked = await pickTopics(n);

    let postsGenerated = 0;
    let emailsGenerated = 0;

    for (const topic of picked) {
      const draft = await generateDraftForTopic(topic.title);
      const model = getContentModel();
      const autoImageUrl = await tryAutoRenderImage({
        overlayHook: draft.post.overlayHook,
        overlayCta: draft.post.overlayCta,
        overlayClosing: draft.post.overlayClosing,
      });

      await db.insert(draftPosts).values({
        topicId: topic.id,
        platform: "both",
        aiCaptionFacebook: draft.post.captionFacebook,
        aiCaptionInstagram: draft.post.captionInstagram,
        hashtags: draft.post.hashtags,
        overlayHook: draft.post.overlayHook,
        overlayCta: draft.post.overlayCta,
        overlayClosing: draft.post.overlayClosing,
        imageUrl: autoImageUrl,
        imageSource: autoImageUrl ? "auto_template" : null,
        aiModel: model,
      });
      postsGenerated += 1;

      await db.insert(draftEmails).values({
        topicId: topic.id,
        aiSubject: draft.email.subject,
        aiBodyHtml: draft.email.bodyHtml,
        aiBodyText: draft.email.bodyText,
        aiModel: model,
      });
      emailsGenerated += 1;

      await db.update(topics).set({ status: "used" }).where(eq(topics.id, topic.id));
    }

    await db
      .update(generationRuns)
      .set({
        status: "success",
        topicsGenerated: picked.length,
        postsGenerated,
        emailsGenerated,
      })
      .where(eq(generationRuns.id, run.id));

    return { topicsGenerated: picked.length, postsGenerated, emailsGenerated };
  } catch (err) {
    await db
      .update(generationRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(generationRuns.id, run.id));
    throw err;
  }
}
