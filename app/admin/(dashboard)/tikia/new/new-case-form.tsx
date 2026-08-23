"use client";

import { useActionState } from "react";
import { createCaseAction } from "../actions";

const CASE_TYPES = [
  { value: "purchase", label: "רכישה" },
  { value: "refinance", label: "מיחזור" },
  { value: "construction", label: "בנייה" },
  { value: "other", label: "אחר" },
];

type DocType = { key: string; label: string; fields: readonly string[] };

export default function NewCaseForm({
  docTypes,
}: {
  docTypes: readonly DocType[];
}) {
  const [state, action, pending] = useActionState(createCaseAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">שם לקוח *</span>
          <input
            name="clientName"
            required
            className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm"
            placeholder="ישראל ישראלי"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">טלפון</span>
          <input
            name="clientPhone"
            type="tel"
            className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm"
            placeholder="050-1234567"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">סוג תיק</span>
          <select
            name="caseType"
            className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm"
          >
            <option value="">בחר סוג</option>
            {CASE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">
            מזהה לקוח ב-Smart NPV
          </span>
          <input
            name="smartNpvClientId"
            className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm"
            placeholder="אופציונלי"
            dir="ltr"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-primary">
          מסמכים נדרשים *
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {docTypes.map((dt) => (
            <label
              key={dt.key}
              className="flex items-center gap-2 rounded-lg border border-black/5 bg-background px-3 py-2 text-sm hover:border-button/30 cursor-pointer"
            >
              <input
                type="checkbox"
                name={`doc_${dt.key}`}
                defaultChecked
                className="accent-button"
              />
              {dt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-button px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "יוצר תיק..." : "צור תיק"}
      </button>
    </form>
  );
}
