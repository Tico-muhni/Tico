"use client";

import { useTransition } from "react";
import { setRtmBriefStatusAction } from "./actions";

export type RtmBriefView = {
  id: string;
  rank: number;
  source: string;
  title: string;
  url: string;
  publishedAt: string | null;
  whatHappened: string;
  meaningForMortgageHolders: string;
  closingQuestion: string;
  status: "new" | "approved" | "dismissed";
};

const STATUS_LABEL: Record<RtmBriefView["status"], string> = {
  new: "חדש",
  approved: "מאושר לסרטון",
  dismissed: "נדחה",
};

// Brand palette. Explicit colors (not theme variables) so the card looks the
// same whether the phone is in light or dark mode.
const GREEN = "#2E8B57";
const GOLD = "#D4AF37";
const NAVY = "#0F243E";
const TEXT = "#1F2A37";

export default function RtmBriefCard({ brief }: { brief: RtmBriefView }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: "approved" | "dismissed") {
    startTransition(() => {
      setRtmBriefStatusAction(brief.id, status);
    });
  }

  return (
    <article
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ backgroundColor: "#ffffff", borderColor: "#E1E7E3" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: GREEN }}
      >
        <div className="flex items-center gap-2 text-xs">
          <a
            href={brief.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold hover:opacity-90"
            style={{ color: GREEN }}
            title="פתח את הכתבה המקורית"
          >
            {brief.source}
            <span aria-hidden="true">↗</span>
          </a>
          {brief.publishedAt && (
            <span className="text-white/80">
              {new Date(brief.publishedAt).toLocaleDateString("he-IL")}
            </span>
          )}
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor:
              brief.status === "approved"
                ? GOLD
                : brief.status === "dismissed"
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.9)",
            color: brief.status === "dismissed" ? "#ffffff" : NAVY,
          }}
        >
          {STATUS_LABEL[brief.status]}
        </span>
      </header>

      <div className="flex flex-col gap-4 p-5">
        <a
          href={brief.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold leading-snug hover:underline"
          style={{ color: NAVY }}
        >
          {brief.title}
        </a>

        <div>
          <h3 className="mb-1 text-xs font-extrabold" style={{ color: GREEN }}>
            מה קרה
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: TEXT }}>
            {brief.whatHappened}
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: "#EAF6EF" }}>
          <h3 className="mb-1 flex items-center gap-1 text-xs font-extrabold" style={{ color: GREEN }}>
            מה זה אומר למחזיקי משכנתא
            <span className="font-medium" style={{ color: "#6B8578" }}>
              · התסריט לסרטון 🎬
            </span>
          </h3>
          <p
            className="whitespace-pre-line text-sm leading-relaxed"
            style={{ color: TEXT }}
          >
            {brief.meaningForMortgageHolders}
          </p>
        </div>

        <div
          className="rounded-xl border-2 p-4"
          style={{ borderColor: GOLD, backgroundColor: "#FCF8EC" }}
        >
          <h3 className="mb-1 text-xs font-extrabold" style={{ color: "#A6801F" }}>
            שאלת סיום לסרטון
          </h3>
          <p className="text-sm font-semibold leading-relaxed" style={{ color: NAVY }}>
            {brief.closingQuestion}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isPending || brief.status === "approved"}
            onClick={() => setStatus("approved")}
            className="rounded-full px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            אישור לסרטון
          </button>
          <button
            type="button"
            disabled={isPending || brief.status === "dismissed"}
            onClick={() => setStatus("dismissed")}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
            style={{ borderColor: "#CBD5D0", color: "#6B7280" }}
          >
            דחייה
          </button>
          <a
            href={brief.url}
            target="_blank"
            rel="noreferrer"
            className="mr-auto flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-bold hover:bg-black/5"
            style={{ borderColor: GREEN, color: GREEN }}
          >
            לכתבה המקורית
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
