import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { draftPosts, draftEmails, topics } from "@/drizzle/schema";
import PostDraftCard from "./post-draft-card";
import EmailDraftCard from "./email-draft-card";

export default async function DraftsPage() {
  const pendingPosts = await db
    .select({
      id: draftPosts.id,
      platform: draftPosts.platform,
      aiCaptionFacebook: draftPosts.aiCaptionFacebook,
      aiCaptionInstagram: draftPosts.aiCaptionInstagram,
      finalCaptionFacebook: draftPosts.finalCaptionFacebook,
      finalCaptionInstagram: draftPosts.finalCaptionInstagram,
      hashtags: draftPosts.hashtags,
      imageUrl: draftPosts.imageUrl,
      imageSource: draftPosts.imageSource,
      disclaimerConfirmed: draftPosts.disclaimerConfirmed,
      noGuaranteeConfirmed: draftPosts.noGuaranteeConfirmed,
      topicTitle: topics.title,
    })
    .from(draftPosts)
    .leftJoin(topics, eq(draftPosts.topicId, topics.id))
    .where(eq(draftPosts.status, "pending_review"))
    .orderBy(desc(draftPosts.generatedAt));

  const pendingEmails = await db
    .select({
      id: draftEmails.id,
      aiSubject: draftEmails.aiSubject,
      finalSubject: draftEmails.finalSubject,
      aiBodyHtml: draftEmails.aiBodyHtml,
      finalBodyHtml: draftEmails.finalBodyHtml,
      aiBodyText: draftEmails.aiBodyText,
      finalBodyText: draftEmails.finalBodyText,
      disclaimerConfirmed: draftEmails.disclaimerConfirmed,
      noGuaranteeConfirmed: draftEmails.noGuaranteeConfirmed,
      topicTitle: topics.title,
    })
    .from(draftEmails)
    .leftJoin(topics, eq(draftEmails.topicId, topics.id))
    .where(eq(draftEmails.status, "pending_review"))
    .orderBy(desc(draftEmails.generatedAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">טיוטות לאישור</h1>
        <p className="text-sm text-foreground/60">
          שום דבר לא יוצא לאוויר בלי שתאשרו כאן. אפשר לערוך לפני האישור.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-primary">
          פוסטים ({pendingPosts.length})
        </h2>
        {pendingPosts.length === 0 && (
          <p className="text-sm text-foreground/50">אין טיוטות פוסט ממתינות.</p>
        )}
        {pendingPosts.map((draft) => (
          <PostDraftCard key={draft.id} draft={draft} />
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-primary">
          מיילים ({pendingEmails.length})
        </h2>
        {pendingEmails.length === 0 && (
          <p className="text-sm text-foreground/50">אין טיוטות מייל ממתינות.</p>
        )}
        {pendingEmails.map((draft) => (
          <EmailDraftCard key={draft.id} draft={draft} />
        ))}
      </section>
    </div>
  );
}
