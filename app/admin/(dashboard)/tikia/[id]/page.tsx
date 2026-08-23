import { eq, and, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tikiaCases, tikiaDocuments } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import { DOC_TYPE_REGISTRY } from "@/lib/doc-analyzer";
import UploadDocForm from "./upload-doc-form";
import { retryPushAction } from "../actions";

type Props = { params: Promise<{ id: string }> };

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");

  const caseRow = await db.query.tikiaCases.findFirst({
    where: and(eq(tikiaCases.id, id), eq(tikiaCases.userId, userId)),
  });
  if (!caseRow) notFound();

  const docs = await db
    .select()
    .from(tikiaDocuments)
    .where(eq(tikiaDocuments.caseId, id))
    .orderBy(desc(tikiaDocuments.createdAt));

  const identifiedTypes: Set<string> = new Set(
    docs
      .filter((d) => d.status === "identified" || d.status === "pushed")
      .map((d) => d.docType)
      .filter((t): t is string => t !== null)
  );

  const docTypeMap = new Map<string, string>(DOC_TYPE_REGISTRY.map((dt) => [dt.key, dt.label]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">
          {caseRow.clientName}
        </h1>
        <div className="mt-1 flex flex-wrap gap-4 text-sm text-foreground/60">
          {caseRow.caseType && <span>סוג: {caseRow.caseType}</span>}
          {caseRow.clientPhone && <span>טלפון: {caseRow.clientPhone}</span>}
          {caseRow.smartNpvClientId && (
            <span>Smart NPV: {caseRow.smartNpvClientId}</span>
          )}
          <span
            className={
              caseRow.status === "complete"
                ? "text-emerald-700 font-medium"
                : ""
            }
          >
            {caseRow.status === "active"
              ? "פעיל"
              : caseRow.status === "complete"
                ? "הושלם"
                : "בארכיון"}
          </span>
        </div>
      </div>

      {/* Document checklist */}
      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">
          רשימת מסמכים נדרשים
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {caseRow.requiredDocTypes.map((key) => {
            const received = identifiedTypes.has(key);
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  received
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-black/5 bg-background text-foreground/60"
                }`}
              >
                <span>{received ? "✓" : "○"}</span>
                <span>{docTypeMap.get(key) ?? key}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upload zone */}
      {caseRow.status !== "archived" && (
        <section className="rounded-2xl border border-black/5 bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">
            העלאת מסמך
          </h2>
          <UploadDocForm caseId={id} />
        </section>
      )}

      {/* Documents list */}
      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">
          מסמכים שהתקבלו ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <p className="text-sm text-foreground/50">
            טרם הועלו מסמכים לתיק זה
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-right text-sm">
              <thead>
                <tr className="border-b border-black/5 text-foreground/60">
                  <th className="py-2">סוג</th>
                  <th className="py-2">מקור</th>
                  <th className="py-2">סטטוס</th>
                  <th className="py-2">תאריך</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-black/5">
                    <td className="py-2">
                      {d.docTypeLabel || d.docType || "לא זוהה"}
                    </td>
                    <td className="py-2 text-foreground/60">
                      {d.source === "manual"
                        ? "ידני"
                        : d.source === "smart_npv"
                          ? "Smart NPV"
                          : "WhatsApp"}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-2 text-foreground/60">
                      {d.createdAt.toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-2">
                      {d.status === "push_failed" && (
                        <form action={retryPushAction.bind(null, d.id)}>
                          <button className="text-xs text-button hover:underline">
                            נסה שוב
                          </button>
                        </form>
                      )}
                      {d.fileUrl && (
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground/50 hover:underline mr-2"
                        >
                          צפה
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Extracted data */}
      {docs.some((d) => d.extractedData) && (
        <section className="rounded-2xl border border-black/5 bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">
            נתונים שחולצו
          </h2>
          <div className="flex flex-col gap-4">
            {docs
              .filter((d) => d.extractedData)
              .map((d) => {
                let fields: Record<string, string> = {};
                try {
                  fields = JSON.parse(d.extractedData!);
                } catch {
                  /* ignore */
                }
                return (
                  <div key={d.id} className="rounded-lg border border-black/5 bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-primary">
                      {d.docTypeLabel || d.docType}
                    </p>
                    <div className="grid gap-1 text-sm sm:grid-cols-2">
                      {Object.entries(fields).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-foreground/50">{k}:</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    received: { label: "התקבל", className: "text-foreground/60" },
    analyzing: { label: "מנתח...", className: "text-amber-600" },
    identified: { label: "זוהה", className: "text-emerald-700" },
    pushed: { label: "נדחף ל-CRM", className: "text-emerald-700" },
    push_failed: { label: "דחיפה נכשלה", className: "text-red-600" },
    rejected: { label: "נדחה", className: "text-red-600" },
  };
  const info = map[status] ?? { label: status, className: "text-foreground/60" };
  return <span className={info.className}>{info.label}</span>;
}
