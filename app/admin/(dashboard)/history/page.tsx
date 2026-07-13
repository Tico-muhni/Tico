import { desc, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { draftPosts, draftEmails } from "@/drizzle/schema";
import { retryPublishPostAction, retrySendEmailAction } from "../drafts/actions";

const POST_STATUS_LABEL: Record<string, string> = {
  approved: "אושר",
  published: "פורסם",
  rejected: "נדחה",
  failed: "נכשל",
};

const EMAIL_STATUS_LABEL: Record<string, string> = {
  approved: "אושר",
  sent: "נשלח",
  rejected: "נדחה",
  failed: "נכשל",
};

function statusColor(status: string) {
  if (status === "published" || status === "sent") return "text-emerald-700";
  if (status === "failed") return "text-button";
  if (status === "rejected") return "text-foreground/50";
  return "text-secondary";
}

export default async function HistoryPage() {
  const posts = await db
    .select()
    .from(draftPosts)
    .where(ne(draftPosts.status, "pending_review"))
    .orderBy(desc(draftPosts.reviewedAt));

  const emails = await db
    .select()
    .from(draftEmails)
    .where(ne(draftEmails.status, "pending_review"))
    .orderBy(desc(draftEmails.reviewedAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">היסטוריה</h1>
        <p className="text-sm text-foreground/60">
          כל מה שאושר, נדחה, פורסם או נשלח - כולל אפשרות ניסיון חוזר לפריטים
          שנכשלו.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-primary">פוסטים</h2>
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-surface p-4 text-sm"
            >
              <div className="flex flex-col gap-1">
                <span className={statusColor(p.status)}>
                  {POST_STATUS_LABEL[p.status] ?? p.status}
                </span>
                <span className="max-w-lg truncate text-foreground/70">
                  {p.finalCaptionFacebook || p.aiCaptionFacebook}
                </span>
                {p.publishError && (
                  <span className="text-xs text-button">{p.publishError}</span>
                )}
              </div>
              {p.status === "failed" && (
                <form action={retryPublishPostAction.bind(null, p.id)}>
                  <button className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5">
                    ניסיון חוזר
                  </button>
                </form>
              )}
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-foreground/50">אין עדיין היסטוריה.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-primary">מיילים</h2>
        <div className="flex flex-col gap-3">
          {emails.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-surface p-4 text-sm"
            >
              <div className="flex flex-col gap-1">
                <span className={statusColor(e.status)}>
                  {EMAIL_STATUS_LABEL[e.status] ?? e.status}
                </span>
                <span className="text-foreground/70">
                  {e.finalSubject || e.aiSubject}
                  {typeof e.recipientsCount === "number" && (
                    <span className="text-foreground/50">
                      {" "}
                      · {e.recipientsCount} נמענים
                    </span>
                  )}
                </span>
                {e.sendError && (
                  <span className="text-xs text-button">{e.sendError}</span>
                )}
              </div>
              {e.status === "failed" && (
                <form action={retrySendEmailAction.bind(null, e.id)}>
                  <button className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5">
                    ניסיון חוזר
                  </button>
                </form>
              )}
            </div>
          ))}
          {emails.length === 0 && (
            <p className="text-sm text-foreground/50">אין עדיין היסטוריה.</p>
          )}
        </div>
      </section>
    </div>
  );
}
