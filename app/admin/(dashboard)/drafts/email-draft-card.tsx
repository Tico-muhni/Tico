"use client";

import { useActionState } from "react";
import {
  approveDraftEmailAction,
  rejectDraftEmailAction,
  saveDraftEmailAction,
} from "./actions";

type EmailDraft = {
  id: string;
  aiSubject: string | null;
  finalSubject: string | null;
  aiBodyHtml: string | null;
  finalBodyHtml: string | null;
  aiBodyText: string | null;
  finalBodyText: string | null;
  topicTitle: string | null;
  disclaimerConfirmed: boolean;
  noGuaranteeConfirmed: boolean;
};

export default function EmailDraftCard({ draft }: { draft: EmailDraft }) {
  const approveWithId = approveDraftEmailAction.bind(null, draft.id);
  const [state, formAction, pending] = useActionState(approveWithId, {
    error: null,
    success: null,
  });

  return (
    <form action={formAction} className="rounded-2xl border border-black/5 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-primary">
          מייל לרשימת התפוצה
        </span>
        {draft.topicTitle && (
          <span className="text-xs text-foreground/50">{draft.topicTitle}</span>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        נושא המייל
        <input
          name="subject"
          defaultValue={draft.finalSubject ?? draft.aiSubject ?? ""}
          className="rounded-lg border border-black/10 px-3 py-2"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        גוף המייל (HTML)
        <textarea
          name="bodyHtml"
          defaultValue={draft.finalBodyHtml ?? draft.aiBodyHtml ?? ""}
          rows={8}
          className="rounded-lg border border-black/10 px-3 py-2 font-mono text-xs"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        גוף המייל (טקסט רגיל)
        <textarea
          name="bodyText"
          defaultValue={draft.finalBodyText ?? draft.aiBodyText ?? ""}
          rows={5}
          className="rounded-lg border border-black/10 px-3 py-2"
        />
      </label>

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
          אין הבטחות תוצאה/ריבית/רווח במייל
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          formAction={saveDraftEmailAction.bind(null, draft.id)}
          className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium hover:bg-black/5"
        >
          שמירה בלבד
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "שולח..." : "אישור ושליחה"}
        </button>
        <input
          type="text"
          name="rejectionReason"
          placeholder="סיבת דחייה (אופציונלי)"
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          formAction={rejectDraftEmailAction.bind(null, draft.id)}
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
