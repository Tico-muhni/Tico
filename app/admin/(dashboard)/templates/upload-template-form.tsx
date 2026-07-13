"use client";

import { useActionState } from "react";
import { uploadTemplateAction } from "./actions";

const ZONE_OPTIONS = [
  { value: "bottom", label: "למטה (עם הצללה)" },
  { value: "top", label: "למעלה (עם הצללה)" },
  { value: "right", label: "בצד ימין" },
  { value: "left", label: "בצד שמאל" },
];

const COLOR_OPTIONS = [
  { value: "light", label: "בהיר (טקסט לבן, לרקע כהה/צבעוני)" },
  { value: "dark", label: "כהה (טקסט כחול-כהה, לרקע בהיר)" },
];

export default function UploadTemplateForm() {
  const [state, formAction, pending] = useActionState(uploadTemplateAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          שם התבנית
          <input
            name="label"
            required
            placeholder="לדוגמה: תמונת פרופיל - עיגול ירוק"
            className="rounded-lg border border-black/10 px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          תמונת רקע
          <input type="file" name="image" accept="image/*" required className="text-sm" />
        </label>
      </div>

      <div className="flex flex-wrap gap-6">
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium">איפה בתמונה יש מקום פנוי לטקסט?</legend>
          {ZONE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="textZone"
                value={opt.value}
                defaultChecked={opt.value === "bottom"}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium">צבע הטקסט</legend>
          {COLOR_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="textColor"
                value={opt.value}
                defaultChecked={opt.value === "light"}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "מעלה..." : "הוספת תבנית"}
        </button>
        {state.error && <span className="text-sm text-button">{state.error}</span>}
      </div>
    </form>
  );
}
