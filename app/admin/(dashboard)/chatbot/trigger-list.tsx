"use client";

import { deleteTriggerAction, updateTriggerAction } from "./actions";
import { useState } from "react";

type Trigger = {
  id: string;
  keyword: string;
  replyTemplate: string;
  action: "send_dm" | "reply_comment" | "both";
  active: boolean;
  timesTriggered: number;
  createdAt: Date;
};

const ACTION_LABELS: Record<string, string> = {
  send_dm: "הודעה פרטית",
  reply_comment: "תגובה",
  both: "שניהם",
};

export default function TriggerList({ triggers }: { triggers: Trigger[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (triggers.length === 0) {
    return (
      <div className="rounded-2xl border border-black/5 bg-surface p-6 text-center text-sm text-foreground/50">
        אין טריגרים עדיין. הוסף את הראשון למעלה.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-primary">
        טריגרים פעילים ({triggers.length})
      </h3>
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-surface p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  trigger.active ? "bg-emerald-500" : "bg-gray-300"
                }`}
              />
              <span className="font-medium text-sm text-primary">
                {trigger.keyword}
              </span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-foreground/50">
                {ACTION_LABELS[trigger.action]}
              </span>
            </div>
            <span className="text-xs text-foreground/40">
              {trigger.timesTriggered} הפעלות
            </span>
          </div>

          {editingId === trigger.id ? (
            <form
              action={async (formData) => {
                await updateTriggerAction(trigger.id, formData);
                setEditingId(null);
              }}
              className="flex flex-col gap-2"
            >
              <textarea
                name="replyTemplate"
                defaultValue={trigger.replyTemplate}
                rows={2}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                dir="rtl"
              />
              <select
                name="action"
                defaultValue={trigger.action}
                className="rounded-lg border border-black/10 px-2 py-1 text-sm"
              >
                <option value="send_dm">הודעה פרטית</option>
                <option value="reply_comment">תגובה</option>
                <option value="both">שניהם</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={trigger.active}
                />
                פעיל
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-white"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-foreground/50"
                >
                  ביטול
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-foreground/70" dir="rtl">
                {trigger.replyTemplate}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(trigger.id)}
                  className="text-xs text-foreground/50 hover:text-primary"
                >
                  עריכה
                </button>
                <form action={() => deleteTriggerAction(trigger.id)}>
                  <button
                    type="submit"
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    מחיקה
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
