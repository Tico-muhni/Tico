"use client";

import { useState, useTransition } from "react";
import { setRtmBriefStatusAction, generateSocialPostAction } from "./actions";

export type RtmBriefView = {
  id: string;
  rank: number;
  source: string;
  title: string;
  url: string;
  publishedAt: string | null;
  whatHappened: string;
  meaningForMortgageHolders: string;
  closingQuestion: string;
  status: "new" | "approved" | "dismissed";
};

const STATUS_LABEL: Record<RtmBriefView["status"], string> = {
  new: "חדש",
  approved: "מאושר לסרטון",
  dismissed: "נדחה",
};

// Brand palette. Explicit colors (not theme variables) so the card looks the
// same whether the phone is in light or dark mode.
const GREEN = "#2E8B57";
const GOLD = "#D4AF37";
const NAVY = "#0F243E";
const TEXT = "#1F2A37";

export default function RtmBriefCard({ brief }: { brief: RtmBriefView }) {
  const [isPending, startTransition] = useTransition();
  const [isSocialPending, startSocial] = useTransition();
  const [socialPost, setSocialPost] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function setStatus(status: "approved" | "dismissed") {
    startTransition(() => {
      setRtmBriefStatusAction(brief.id, status);
    });
  }

  function makeSocialPost() {
    setSocialError(null);
    setCopied(false);
    startSocial(async () => {
      const result = await generateSocialPostAction(brief.id);
      if (result.error) setSocialError(result.error);
      else setSocialPost(result.text);
    });
  }

  async function copyPost() {
    if (!socialPost) return;
    try {
      await navigator.clipboard.writeText(socialPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSocialError("ההעתקה נכשלה — סמנו והעתיקו ידנית.");
    }
  }

  return (
    <article
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ backgroundColor: "#ffffff", borderColor: "#E1E7E3" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: GREEN }}
      >
        <div className="flex items-center gap-2 text-xs">
          <a
            href={brief.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold hover:opacity-90"
            style={{ color: GREEN }}
            title="פתח את הכתבה המקורית"
          >
            {brief.source}
            <span aria-hidden="true">↗</span>
          </a>
          {brief.publishedAt && (
            <span className="text-white/80">
              {new Date(brief.publishedAt).toLocaleDateString("he-IL")}
            </span>
          )}
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor:
              brief.status === "approved"
                ? GOLD
                : brief.status === "dismissed"
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.9)",
            color: brief.status === "dismissed" ? "#ffffff" : NAVY,
          }}
        >
          {STATUS_LABEL[brief.status]}
        </span>
      </header>

      <div className="flex flex-col gap-4 p-5">
        <a
          href={brief.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold leading-snug hover:underline"
          style={{ color: NAVY }}
        >
          {brief.title}
        </a>

        <div className="rounded-xl p-4" style={{ backgroundColor: "#F0FAF4", border: `1px dashed ${GREEN}` }}>
          <h3 className="mb-1 text-xs font-extrabold" style={{ color: GREEN }}>
            הוק פתיחה 🎣 · 3 השניות הראשונות
          </h3>
          <p className="text-base font-bold leading-snug" style={{ color: NAVY }}>
            {brief.whatHappened}
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: "#EAF6EF" }}>
          <h3 className="mb-1 text-xs font-extrabold" style={{ color: GREEN }}>
            התסריט לסרטון 🎬
          </h3>
          <p
            className="whitespace-pre-line text-sm leading-relaxed"
            style={{ color: TEXT }}
          >
            {brief.meaningForMortgageHolders}
          </p>
        </div>

        <div
          className="rounded-xl border-2 p-4"
          style={{ borderColor: GOLD, backgroundColor: "#FCF8EC" }}
        >
          <h3 className="mb-1 text-xs font-extrabold" style={{ color: "#A6801F" }}>
            קריאה לפעולה 🔥 · סיום
          </h3>
          <p className="text-sm font-semibold leading-relaxed" style={{ color: NAVY }}>
            {brief.closingQuestion}
          </p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "#CDE3F0", backgroundColor: "#F3F9FD" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold" style={{ color: "#1F6FA8" }}>
              גרסה לוואטסאפ / פייסבוק 📲
            </h3>
            <div className="flex items-center gap-2">
              {socialPost && (
                <button
                  type="button"
                  onClick={copyPost}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  style={{ backgroundColor: copied ? GREEN : "#1F6FA8" }}
                >
                  {copied ? "הועתק ✓" : "העתק"}
                </button>
              )}
              <button
                type="button"
                onClick={makeSocialPost}
                disabled={isSocialPending}
                className="rounded-full border px-3 py-1.5 text-xs font-bold hover:bg-black/5 disabled:opacity-60"
                style={{ borderColor: "#1F6FA8", color: "#1F6FA8" }}
              >
                {isSocialPending
                  ? "כותב..."
                  : socialPost
                    ? "צור מחדש"
                    : "צור טקסט לפרסום"}
              </button>
            </div>
          </div>
          {socialPost && (
            <textarea
              readOnly
              value={socialPost}
              dir="rtl"
              rows={7}
              className="mt-2 w-full resize-none rounded-lg border bg-white p-3 text-sm leading-relaxed outline-none"
              style={{ borderColor: "#CDE3F0", color: TEXT }}
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
          {socialError && (
            <p className="mt-2 text-xs font-medium text-red-600">{socialError}</p>
          )}
          {!socialPost && !socialError && !isSocialPending && (
            <p className="mt-1 text-xs" style={{ color: "#5B7385" }}>
              טקסט כתוב מוכן להדבקה בסטטוס וואטסאפ או בפוסט בפייסבוק.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isPending || brief.status === "approved"}
            onClick={() => setStatus("approved")}
            className="rounded-full px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            אישור לסרטון
          </button>
          <button
            type="button"
            disabled={isPending || brief.status === "dismissed"}
            onClick={() => setStatus("dismissed")}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
            style={{ borderColor: "#CBD5D0", color: "#6B7280" }}
          >
            דחייה
          </button>
          <a
            href={brief.url}
            target="_blank"
            rel="noreferrer"
            className="mr-auto flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-bold hover:bg-black/5"
            style={{ borderColor: GREEN, color: GREEN }}
          >
            לכתבה המקורית
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
