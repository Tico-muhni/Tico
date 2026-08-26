"use client";

import { useActionState } from "react";
import { createTriggerAction } from "./actions";

const initialState = { error: null as string | null, success: null as string | null };

export default function TriggerForm() {
  const [state, formAction, pending] = useActionState(createTriggerAction, initialState);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-primary">טריגר חדש</h3>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">מילת מפתח</span>
          <input
            name="keyword"
            type="text"
            required
            placeholder='לדוגמה: "משכנתא" או "ייעוץ"'
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            dir="rtl"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">תבנית תגובה</span>
          <textarea
            name="replyTemplate"
            required
            rows={3}
            placeholder="היי! 👋 תודה שפנית. אשמח לעזור לך בנושא משכנתא - שלח/י לי פרטים ואחזור אליך"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm leading-relaxed"
            dir="rtl"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">פעולה</span>
          <select
            name="action"
            defaultValue="send_dm"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="send_dm">שלח הודעה פרטית</option>
            <option value="reply_comment">הגב לתגובה</option>
            <option value="both">שניהם</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "יוצר..." : "הוסף טריגר"}
        </button>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600">{state.success}</p>
        )}
      </form>
    </div>
  );
}
