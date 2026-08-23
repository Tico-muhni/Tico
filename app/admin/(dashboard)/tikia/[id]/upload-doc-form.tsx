"use client";

import { useActionState } from "react";
import { uploadDocumentAction } from "../actions";

export default function UploadDocForm({ caseId }: { caseId: string }) {
  const [state, action, pending] = useActionState(uploadDocumentAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="caseId" value={caseId} />

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-black/10 bg-background px-6 py-8 text-sm text-foreground/60 hover:border-button/30">
        <span className="text-2xl">+</span>
        <span>לחץ לבחירת קובץ (תמונה / PDF)</span>
        <input
          type="file"
          name="file"
          accept="image/*,.pdf"
          className="hidden"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-button px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "מעלה ומנתח..." : "העלה מסמך"}
      </button>
    </form>
  );
}
