"use client";

import { useActionState } from "react";
import { addTopicAction } from "./actions";

export default function AddTopicForm() {
  const [state, formAction, pending] = useActionState(addTopicAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 min-w-[240px] flex-col gap-1 text-sm">
        נושא חדש
        <input
          name="title"
          required
          placeholder="לדוגמה: מה זה החזר גרייס במשכנתא"
          className="rounded-lg border border-black/10 px-3 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "מוסיף..." : "הוספה לרשימת הנושאים"}
      </button>
      {state.error && <span className="text-sm text-button">{state.error}</span>}
    </form>
  );
}
