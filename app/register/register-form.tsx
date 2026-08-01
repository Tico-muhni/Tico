"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "./actions";

const TEXT = "#1F2A37";
const HELP = "#5B6B62";
const GREEN = "#2E8B57";

export default function RegisterForm({ requireCode }: { requireCode: boolean }) {
  const [state, formAction, pending] = useActionState(registerAction, {
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: TEXT }}>
        שם (אופציונלי)
        <input
          type="text"
          name="name"
          style={{ color: TEXT }}
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: TEXT }}>
        אימייל
        <input
          type="email"
          name="email"
          required
          style={{ color: TEXT }}
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-[#2E8B57]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: TEXT }}>
        סיסמה (לפחות 6 תווים)
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
            style={{ color: TEXT }}
            className="w-full rounded-lg border border-black/10 px-3 py-2 pl-16 outline-none focus:border-[#2E8B57]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 left-0 flex items-center px-3 text-xs font-semibold"
            style={{ color: GREEN }}
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          >
            {showPassword ? "הסתר" : "הצג"}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: TEXT }}>
        מפתח Gemini API (חינמי, בלי כרטיס אשראי)
        <input
          type="text"
          name="geminiApiKey"
          required
          dir="ltr"
          placeholder="AIza..."
          style={{ color: TEXT }}
          className="rounded-lg border border-black/10 px-3 py-2 text-left outline-none focus:border-[#2E8B57]"
        />
        <span className="text-xs" style={{ color: HELP }}>
          יוצרים מפתח בחינם ב-{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
            style={{ color: GREEN }}
          >
            Google AI Studio
          </a>{" "}
          → &quot;Create API key&quot;. ה-AI שכותב את הבריפים ירוץ על החשבון שלך.
        </span>
      </label>

      {requireCode && (
        <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: TEXT }}>
          קוד הרשמה
          <input
            type="text"
            name="code"
            required
            style={{ color: TEXT }}
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
        style={{ backgroundColor: GREEN }}
      >
        {pending ? "נרשם..." : "הרשמה"}
      </button>

      <p className="text-center text-xs" style={{ color: HELP }}>
        כבר יש לך חשבון?{" "}
        <Link href="/admin/login" className="font-semibold underline" style={{ color: GREEN }}>
          התחברות
        </Link>
      </p>
    </form>
  );
}
