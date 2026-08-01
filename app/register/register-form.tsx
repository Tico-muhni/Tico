"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "./actions";

export default function RegisterForm({ requireCode }: { requireCode: boolean }) {
  const [state, formAction, pending] = useActionState(registerAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        שם (אופציונלי)
        <input
          type="text"
          name="name"
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        אימייל
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        סיסמה (לפחות 6 תווים)
        <input
          type="password"
          name="password"
          required
          minLength={6}
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        מפתח Gemini API (חינמי, בלי כרטיס אשראי)
        <input
          type="text"
          name="geminiApiKey"
          required
          dir="ltr"
          placeholder="AIza..."
          className="rounded-lg border border-black/10 px-3 py-2 text-left outline-none focus:border-[#2E8B57]"
        />
        <span className="text-xs text-foreground/60">
          יוצרים מפתח בחינם ב-{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
            style={{ color: "#2E8B57" }}
          >
            Google AI Studio
          </a>{" "}
          → &quot;Create API key&quot;. ה-AI שכותב את הבריפים ירוץ על החשבון שלך.
        </span>
      </label>

      {requireCode && (
        <label className="flex flex-col gap-1 text-sm">
          קוד הרשמה
          <input
            type="text"
            name="code"
            required
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
          />
        </label>
      )}

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full px-4 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "#2E8B57" }}
      >
        {pending ? "נרשם..." : "הרשמה"}
      </button>

      <p className="text-center text-xs text-foreground/60">
        כבר יש לך חשבון?{" "}
        <Link href="/admin/login" className="font-semibold underline" style={{ color: "#2E8B57" }}>
          התחברות
        </Link>
      </p>
    </form>
  );
}
