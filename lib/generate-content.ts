import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { topics, draftPosts, draftEmails, generationRuns } from "@/drizzle/schema";
import { generateDraftForTopic, getContentModel } from "@/lib/anthropic";
import { SEED_TOPICS } from "@/lib/seed-topics";

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

      await db.insert(draftPosts).values({
        topicId: topic.id,
        platform: "both",
        aiCaptionFacebook: draft.post.captionFacebook,
        aiCaptionInstagram: draft.post.captionInstagram,
        hashtags: draft.post.hashtags,
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
