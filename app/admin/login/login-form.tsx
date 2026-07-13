"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="flex flex-col gap-1 text-sm">
        אימייל
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-secondary"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        סיסמה
        <input
          type="password"
          name="password"
          required
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-secondary"
        />
      </label>
      {state.error && (
        <p className="text-sm text-button" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-button px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
