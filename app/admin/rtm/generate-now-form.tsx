"use client";

import { useState, useTransition } from "react";
import { scanNewsAction } from "./actions";

export default function GenerateRtmNowForm() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ error: string | null; success: string | null }>({
    error: null,
    success: null,
  });

  function handleClick() {
    startTransition(async () => {
      const result = await scanNewsAction();
      setState(result);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "#2E8B57" }}
      >
        {isPending ? "סורק חדשות..." : "סרוק חדשות עכשיו"}
      </button>
      {state.error && (
        <span className="text-sm font-medium text-red-600">{state.error}</span>
      )}
      {state.success && (
        <span className="text-sm font-medium text-emerald-700">{state.success}</span>
      )}
    </div>
  );
}
