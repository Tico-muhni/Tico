"use client";

import { useActionState } from "react";
import { importCsvAction } from "./actions";

export default function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(importCsvAction, {
    error: null,
    summary: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        קובץ CSV (עמודה בשם email, ואופציונלית first_name / last_name)
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "מייבא..." : "ייבוא"}
      </button>
      {state.error && <span className="text-sm text-button">{state.error}</span>}
      {state.summary && (
        <span className="text-sm text-emerald-700">
          נמצאו {state.summary.total} שורות · יובאו {state.summary.imported} ·
          כפולות {state.summary.duplicates} · לא תקינות {state.summary.invalid}
        </span>
      )}
    </form>
  );
}
