"use client";

import { useState, useTransition } from "react";
import { generateBriefAction } from "./actions";

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
  const [error, setError] = useState<string | null>(null);

  function makeBrief() {
    setError(null);
    startTransition(async () => {
      const result = await generateBriefAction(candidate.id);
      if (result.error) setError(result.error);
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

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={makeBrief}
          disabled={isPending}
          className="rounded-full px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
        >
          {isPending ? "כותב בריף..." : "צור בריף ✨"}
        </button>
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    </article>
  );
}
