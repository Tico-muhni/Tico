"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { postImages } from "@/lib/post-images";
import {
  approveDraftPostAction,
  markPostPublishedManuallyAction,
  rejectDraftPostAction,
  saveDraftPostAction,
} from "./actions";

type PostDraft = {
  id: string;
  platform: "facebook" | "instagram" | "both";
  aiCaptionFacebook: string | null;
  aiCaptionInstagram: string | null;
  finalCaptionFacebook: string | null;
  finalCaptionInstagram: string | null;
  hashtags: string[];
  imageUrl: string | null;
  imageUrls: string[];
  imageSource: string | null;
  topicTitle: string | null;
  disclaimerConfirmed: boolean;
  noGuaranteeConfirmed: boolean;
};

const PLATFORM_LABEL: Record<PostDraft["platform"], string> = {
  facebook: "פייסבוק",
  instagram: "אינסטגרם",
  both: "פייסבוק + אינסטגרם",
};

export default function PostDraftCard({ draft }: { draft: PostDraft }) {
  const approveWithId = approveDraftPostAction.bind(null, draft.id);
  const [state, formAction, pending] = useActionState(approveWithId, {
    error: null,
    success: null,
  });

  const formRef = useRef<HTMLFormElement>(null);
  const [note, setNote] = useState("");

  const field = (name: string) =>
    (formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";

  async function copyCaption(name: "captionInstagram" | "captionFacebook") {
    const tags = field("hashtags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    const text = [field(name), tags].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setNote(name === "captionInstagram" ? "כיתוב האינסטגרם הועתק (כולל האשטגים)" : "כיתוב הפייסבוק הועתק (כולל האשטגים)");
    } catch {
      setNote("ההעתקה נחסמה בדפדפן. סמן את הכיתוב והעתק ידנית.");
    }
  }

  async function downloadImages() {
    setNote("מוריד תמונות…");
    for (const [i, src] of slides.entries()) {
      const a = document.createElement("a");
      a.href = `/api/draft-image?url=${encodeURIComponent(src)}&name=post-${String(i + 1).padStart(2, "0")}.png`;
      a.download = "";
      a.click();
      await new Promise((r) => setTimeout(r, 500));
    }
    setNote(slides.length > 1 ? "התמונות ירדו לפי סדר השקפים" : "התמונה ירדה");
  }

  const slides = postImages(draft);
  const needsInstagramImage =
    draft.platform === "instagram" || draft.platform === "both";

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-black/5 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-primary">
          {slides.length > 1 ? `קרוסלה · ${slides.length} תמונות` : "פוסט"} · {PLATFORM_LABEL[draft.platform]}
        </span>
        {draft.topicTitle && (
          <span className="text-xs text-foreground/50">{draft.topicTitle}</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          כיתוב לפייסבוק
          <textarea
            name="captionFacebook"
            defaultValue={draft.finalCaptionFacebook ?? draft.aiCaptionFacebook ?? ""}
            rows={6}
            className="rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          כיתוב לאינסטגרם
          <textarea
            name="captionInstagram"
            defaultValue={draft.finalCaptionInstagram ?? draft.aiCaptionInstagram ?? ""}
            rows={6}
            className="rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        האשטגים (מופרדים בפסיק)
        <input
          name="hashtags"
          defaultValue={draft.hashtags.join(", ")}
          className="rounded-lg border border-black/10 px-3 py-2"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {slides.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {slides.map((src, i) => (
                <div key={src} className="relative shrink-0">
                  <Image
                    src={src}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  {slides.length > 1 && (
                    <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-foreground/50">
              {draft.imageSource === "auto_template"
                ? "נוצרה אוטומטית"
                : draft.imageSource === "canva"
                  ? "מקנבה"
                  : "הועלתה ידנית"}
            </span>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          {slides.length > 1
            ? "החלפה בתמונה אחת (מבטל את הקרוסלה)"
            : slides.length === 1
              ? "החלפת תמונה"
            : needsInstagramImage
              ? "תמונה (חובה לאינסטגרם)"
              : "תמונה (אופציונלי)"}
          <input type="file" name="image" accept="image/*" className="text-sm" />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="disclaimerConfirmed"
            defaultChecked={draft.disclaimerConfirmed}
            className="h-4 w-4"
          />
          כולל משפט &quot;המידע כללי ואינו מהווה ייעוץ פיננסי מחייב&quot;
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="noGuaranteeConfirmed"
            defaultChecked={draft.noGuaranteeConfirmed}
            className="h-4 w-4"
          />
          אין הבטחות תוצאה/ריבית/רווח בפוסט
        </label>
      </div>

      <div className="mt-4 rounded-xl bg-primary/5 p-3">
        <div className="mb-2 text-sm font-medium text-primary">פרסום ידני (בלי מטא)</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={() => copyCaption("captionInstagram")} className="rounded-full border border-black/10 bg-surface px-3 py-1.5 hover:bg-black/5">
            העתק כיתוב לאינסטגרם
          </button>
          <button type="button" onClick={() => copyCaption("captionFacebook")} className="rounded-full border border-black/10 bg-surface px-3 py-1.5 hover:bg-black/5">
            העתק כיתוב לפייסבוק
          </button>
          {slides.length > 0 && (
            <button type="button" onClick={downloadImages} className="rounded-full border border-black/10 bg-surface px-3 py-1.5 hover:bg-black/5">
              {slides.length > 1 ? `הורד ${slides.length} תמונות` : "הורד תמונה"}
            </button>
          )}
          <button
            type="submit"
            formAction={markPostPublishedManuallyAction.bind(null, draft.id)}
            className="rounded-full bg-primary px-3 py-1.5 text-white hover:opacity-90"
          >
            סמן כפורסם ידנית
          </button>
        </div>
        {note && <div className="mt-2 text-xs text-foreground/70">{note}</div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          formAction={saveDraftPostAction.bind(null, draft.id)}
          className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium hover:bg-black/5"
        >
          שמירה בלבד
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "מפרסם..." : "אישור ופרסום"}
        </button>
        <input type="text" name="rejectionReason" placeholder="סיבת דחייה (אופציונלי)" className="rounded-lg border border-black/10 px-3 py-1.5 text-sm" />
        <button
          type="submit"
          formAction={rejectDraftPostAction.bind(null, draft.id)}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          דחייה
        </button>
        {state.error && <span className="text-sm text-rose-600">{state.error}</span>}
        {state.success && <span className="text-sm text-emerald-700">{state.success}</span>}
      </div>
    </form>
  );
}
