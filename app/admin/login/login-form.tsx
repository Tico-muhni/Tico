"use client";

import { useActionState, useState } from "react";
import { loginAction } from "./actions";

const TEXT = "#1F2A37";
const GREEN = "#2E8B57";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
        סיסמה
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
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
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full px-4 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: GREEN }}
      >
        {pending ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
