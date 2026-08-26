"use client";

import { useActionState, useRef, useState, type DragEvent } from "react";
import { bulkImportAction } from "./actions";

const initialState = {
  error: null as string | null,
  progress: null as { current: number; total: number } | null,
  summary: null as { imported: number; failed: number; errors: string[] } | null,
};

export default function ImportForm() {
  const [state, formAction, pending] = useActionState(bulkImportAction, initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const arr = Array.from(newFiles).filter((f) =>
      ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type)
    );
    setFiles((prev) => [...prev, ...arr]);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(formData: FormData) {
    formData.delete("images");
    for (const file of files) {
      formData.append("images", file);
    }
    formAction(formData);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-black/10 bg-surface hover:border-emerald-400"
        }`}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3 text-emerald-600"
        >
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m16 16-4-4-4 4" />
        </svg>
        <p className="text-sm font-medium text-foreground/80">
          גרור תמונות לכאן או לחץ לבחירה
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          PNG, JPG, WebP · עד 10MB לתמונה · עד 100 תמונות
        </p>
        <input
          ref={inputRef}
          type="file"
          name="images"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              {files.length} תמונות נבחרו
            </span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-foreground/50 hover:text-button"
            >
              נקה הכל
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="group relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-24 w-full rounded-lg border border-black/5 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  x
                </button>
                <p className="mt-1 truncate text-[10px] text-foreground/50">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-primary">הגדרות ייבוא</h3>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">פלטפורמה</span>
          <select
            name="platform"
            defaultValue="both"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="both">Instagram + Facebook</option>
            <option value="instagram">Instagram בלבד</option>
            <option value="facebook">Facebook בלבד</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/70">
            תיאורים לתמונות (אופציונלי)
          </span>
          <textarea
            name="descriptions"
            rows={4}
            placeholder={"image1.png: פוסט על טיפים למשכנתא ראשונה\nimage2.png: עדכון ריבית פריים"}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm leading-relaxed"
            dir="rtl"
          />
          <span className="text-xs text-foreground/50">
            שם הקובץ + נקודתיים + תיאור. שורה לכל תמונה. אם לא ניתן תיאור, ה-AI ינסה להבין מהשם.
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || files.length === 0}
        className="self-start rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? `מייבא... (זה יכול לקחת כמה דקות)` : `ייבא ${files.length} תמונות`}
      </button>

      {/* Status */}
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.summary && (
        <div className="flex flex-col gap-3 rounded-xl border border-black/5 bg-surface p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-primary">תוצאות הייבוא</h4>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold text-emerald-600">
                {state.summary.imported}
              </span>
              <span className="mr-1 text-foreground/60">יובאו בהצלחה</span>
            </div>
            {state.summary.failed > 0 && (
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {state.summary.failed}
                </span>
                <span className="mr-1 text-foreground/60">נכשלו</span>
              </div>
            )}
          </div>
          {state.summary.errors.length > 0 && (
            <details className="text-xs text-foreground/60">
              <summary className="cursor-pointer font-medium">
                שגיאות ({state.summary.errors.length})
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {state.summary.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
          {state.summary.imported > 0 && (
            <a
              href="/admin/drafts"
              className="self-start rounded-full bg-primary px-6 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              עבור לאישור הטיוטות
            </a>
          )}
        </div>
      )}
    </form>
  );
}
