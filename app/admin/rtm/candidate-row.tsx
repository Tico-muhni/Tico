"use client";

import { useState, useTransition } from "react";
import { generateBriefAction, deleteNewsItemAction } from "./actions";

export type CandidateView = {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string | null;
};

const GREEN = "#2E8B57";
const NAVY = "#0F243E";

export default function CandidateRow({ candidate }: { candidate: CandidateView }) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorIsQuota, setErrorIsQuota] = useState(false);
  const [pendingStyle, setPendingStyle] = useState<
    "article" | "inspired" | null
  >(null);

  function makeBrief(style: "article" | "inspired") {
    setError(null);
    setErrorIsQuota(false);
    setPendingStyle(style);
    startTransition(async () => {
      const result = await generateBriefAction(candidate.id, style);
      if (result.error) {
        setError(result.error);
        setErrorIsQuota(!!result.quota);
      }
      setPendingStyle(null);
    });
  }

  function removeCandidate() {
    if (!confirm("להסיר את הכתבה הזו מהרשימה?")) return;
    startDeleting(async () => {
      await deleteNewsItemAction(candidate.id);
    });
  }

  return (
    <article
      className="rounded-2xl border bg-white p-4 shadow-sm"
      style={{ borderColor: "#E1E7E3" }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs">
        <a
          href={candidate.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-full px-2.5 py-1 font-bold hover:opacity-90"
          style={{ backgroundColor: "#EAF6EF", color: GREEN }}
          title="פתח את הכתבה המקורית"
        >
          {candidate.source}
          <span aria-hidden="true">↗</span>
        </a>
        {candidate.publishedAt && (
          <span style={{ color: "#8A968F" }}>
            {new Date(candidate.publishedAt).toLocaleDateString("he-IL")}
          </span>
        )}
      </div>

      <a
        href={candidate.url}
        target="_blank"
        rel="noreferrer"
        className="block text-sm font-bold leading-snug hover:underline"
        style={{ color: NAVY }}
      >
        {candidate.title}
      </a>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => makeBrief("article")}
          disabled={isPending || isDeleting}
          className="rounded-full px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
          title="בריף שמגיב לכתבה הזו (RTM)"
        >
          {pendingStyle === "article" ? "כותב..." : "בריף מהכתבה 📰"}
        </button>
        <button
          type="button"
          onClick={() => makeBrief("inspired")}
          disabled={isPending || isDeleting}
          className="rounded-full border-2 px-4 py-2 text-sm font-bold hover:bg-black/5 disabled:opacity-60"
          style={{ borderColor: GREEN, color: GREEN }}
          title="סרטון חינוכי כללי בהשראת הנושא — לא על הכתבה עצמה"
        >
          {pendingStyle === "inspired" ? "כותב..." : "בריף בהשראה 💡"}
        </button>
        <button
          type="button"
          onClick={removeCandidate}
          disabled={isPending || isDeleting}
          className="mr-auto rounded-full border px-3 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
          style={{ borderColor: "#E1B0B0", color: "#B4232A" }}
          title="הסר את הכתבה מהרשימה"
        >
          {isDeleting ? "מסיר..." : "הסר 🗑️"}
        </button>
        {error &&
          (errorIsQuota ? (
            <p
              className="w-full rounded-lg border p-2 text-xs font-medium"
              style={{
                backgroundColor: "#FEF6E7",
                borderColor: "#F0C36D",
                color: "#8A6D1B",
              }}
            >
              🕛 {error}
            </p>
          ) : (
            <span className="w-full text-xs font-medium text-red-600">
              {error}
            </span>
          ))}
      </div>
    </article>
  );
}
