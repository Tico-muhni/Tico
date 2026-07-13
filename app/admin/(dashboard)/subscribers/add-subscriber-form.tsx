"use client";

import { useActionState } from "react";
import { addSubscriberAction } from "./actions";

export default function AddSubscriberForm() {
  const [state, formAction, pending] = useActionState(addSubscriberAction, {
    error: null,
    success: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        אימייל
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border border-black/10 px-3 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        שם פרטי
        <input name="firstName" className="rounded-lg border border-black/10 px-3 py-1.5" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        שם משפחה
        <input name="lastName" className="rounded-lg border border-black/10 px-3 py-1.5" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "מוסיף..." : "הוספה"}
      </button>
      {state.error && <span className="text-sm text-button">{state.error}</span>}
      {state.success && <span className="text-sm text-emerald-700">{state.success}</span>}
    </form>
  );
}
