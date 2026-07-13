"use client";

import { useActionState } from "react";
import { uploadTemplateAction } from "./actions";

export default function UploadTemplateForm() {
  const [state, formAction, pending] = useActionState(uploadTemplateAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        שם התבנית
        <input
          name="label"
          required
          placeholder="לדוגמה: משרד - רקע כחול"
          className="rounded-lg border border-black/10 px-3 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        תמונת רקע
        <input type="file" name="image" accept="image/*" required className="text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "מעלה..." : "הוספת תבנית"}
      </button>
      {state.error && <span className="text-sm text-button">{state.error}</span>}
    </form>
  );
}
