"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  approveDraftPostAction,
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

  const needsInstagramImage =
    draft.platform === "instagram" || draft.platform === "both";

  return (
    <form action={formAction} className="rounded-2xl border border-black/5 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-primary">
          פוסט · {PLATFORM_LABEL[draft.platform]}
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
        {draft.imageUrl && (
          <Image
            src={draft.imageUrl}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
        <label className="flex flex-col gap-1 text-sm">
          {needsInstagramImage ? "תמונה (חובה לאינסטגרם)" : "תמונה (אופציונלי)"}
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
          className="rounded-full px-4 py-1.5 text-sm font-medium text-button hover:bg-button/10"
        >
          דחייה
        </button>
        {state.error && <span className="text-sm text-button">{state.error}</span>}
        {state.success && <span className="text-sm text-emerald-700">{state.success}</span>}
      </div>
    </form>
  );
}
