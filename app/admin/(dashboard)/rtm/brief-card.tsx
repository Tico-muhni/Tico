"use client";

import { useTransition } from "react";
import { setRtmBriefStatusAction } from "./actions";
import type { RtmSource } from "@/lib/rtm-news-sources";

export type RtmBriefView = {
  id: string;
  source: RtmSource;
  sourceLabel: string;
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
      style={{ borderColor: "#0F243E22" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-white"
        style={{ backgroundColor: "#0F243E" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span
            className="rounded-full px-2.5 py-1 font-semibold"
            style={{ backgroundColor: "#2E8B57" }}
          >
            {brief.sourceLabel}
          </span>
          {brief.publishedAt && (
            <span className="text-white/60">
              {new Date(brief.publishedAt).toLocaleDateString("he-IL")}
            </span>
          )}
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor:
              brief.status === "approved"
                ? "#2E8B57"
                : brief.status === "dismissed"
                  ? "#ffffff22"
                  : "#D4AF37",
            color: brief.status === "dismissed" ? "#ffffff" : "#0F243E",
          }}
        >
          {STATUS_LABEL[brief.status]}
        </span>
      </header>

      <div className="flex flex-col gap-4 bg-surface p-5">
        <a
          href={brief.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold hover:underline"
          style={{ color: "#0F243E" }}
        >
          {brief.title}
        </a>

        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: "#2E8B57" }}>
            מה קרה
          </h3>
          <p className="text-sm text-foreground">{brief.whatHappened}</p>
        </div>

        <div
          className="rounded-xl p-4 text-sm"
          style={{ backgroundColor: "#0F243E0d" }}
        >
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: "#0F243E" }}>
            מה זה אומר למחזיקי משכנתא
          </h3>
          <p className="text-foreground">{brief.meaningForMortgageHolders}</p>
        </div>

        <div className="rounded-xl border-2 p-4 text-sm" style={{ borderColor: "#D4AF37" }}>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: "#a8842a" }}>
            שאלת סיום לסרטון
          </h3>
          <p className="font-medium text-foreground">{brief.closingQuestion}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isPending || brief.status === "approved"}
            onClick={() => setStatus("approved")}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#2E8B57" }}
          >
            אישור לסרטון
          </button>
          <button
            type="button"
            disabled={isPending || brief.status === "dismissed"}
            onClick={() => setStatus("dismissed")}
            className="rounded-full border px-4 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
            style={{ borderColor: "#0F243E33", color: "#0F243E" }}
          >
            דחייה
          </button>
        </div>
      </div>
    </article>
  );
}
