"use client";

import { useActionState } from "react";
import { generateNowAction } from "./actions";

export default function GenerateNowForm() {
  const [state, formAction, pending] = useActionState(generateNowAction, {
    error: null,
    success: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        כמה טיוטות ליצור עכשיו
        <input
          type="number"
          name="count"
          min={1}
          max={10}
          defaultValue={2}
          className="w-24 rounded-lg border border-black/10 px-3 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-button px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "יוצר תוכן..." : "צור טיוטות עכשיו"}
      </button>
      {state.error && <span className="text-sm text-button">{state.error}</span>}
      {state.success && <span className="text-sm text-emerald-700">{state.success}</span>}
    </form>
  );
}
