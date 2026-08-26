"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "./actions";

type Settings = {
  id: string;
  aiSmartRepliesEnabled: boolean;
  storyAutoReplyEnabled: boolean;
  storyAutoReplyTemplate: string;
  commentToDmEnabled: boolean;
};

const initialState = { error: null as string | null, success: null as string | null };

export default function SettingsPanel({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-primary">הגדרות צ&apos;אטבוט</h3>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="font-medium text-foreground/80">תגובות AI חכמות</span>
            <span className="text-xs text-foreground/50">
              AI עונה אוטומטית להודעות שאין להן טריגר
            </span>
          </div>
          <input
            type="checkbox"
            name="aiSmartRepliesEnabled"
            defaultChecked={settings.aiSmartRepliesEnabled}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="font-medium text-foreground/80">מענה אוטומטי לסטוריז</span>
            <span className="text-xs text-foreground/50">
              שולח הודעה אוטומטית למי שמגיב על סטורי
            </span>
          </div>
          <input
            type="checkbox"
            name="storyAutoReplyEnabled"
            defaultChecked={settings.storyAutoReplyEnabled}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">תבנית תגובה לסטוריז</span>
          <textarea
            name="storyAutoReplyTemplate"
            rows={2}
            defaultValue={settings.storyAutoReplyTemplate}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm leading-relaxed"
            dir="rtl"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="font-medium text-foreground/80">תגובה → הודעה פרטית</span>
            <span className="text-xs text-foreground/50">
              כשמזהים טריגר בתגובה, שולחים גם DM
            </span>
          </div>
          <input
            type="checkbox"
            name="commentToDmEnabled"
            defaultChecked={settings.commentToDmEnabled}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "שומר..." : "שמור הגדרות"}
        </button>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </form>

      <div className="border-t border-black/5 pt-4">
        <h4 className="text-xs font-semibold text-foreground/50 mb-2">חיבור Webhook</h4>
        <div className="rounded-lg bg-black/[0.02] p-3 text-xs text-foreground/60" dir="ltr">
          <p className="font-mono break-all">
            POST /api/webhook/instagram
          </p>
          <p className="mt-1">
            Verify Token: <code className="bg-black/5 px-1 rounded">META_WEBHOOK_VERIFY_TOKEN</code>
          </p>
        </div>
        <p className="mt-2 text-xs text-foreground/50" dir="rtl">
          הגדר את ה-Webhook ב-Meta Developer Console עם Subscriptions: messages, messaging_postbacks
        </p>
      </div>
    </div>
  );
}
