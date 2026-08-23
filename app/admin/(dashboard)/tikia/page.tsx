import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tikiaCases, tikiaDocuments } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { archiveCaseAction } from "./actions";

export default async function TikiaPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");

  const cases = await db
    .select()
    .from(tikiaCases)
    .where(eq(tikiaCases.userId, userId))
    .orderBy(desc(tikiaCases.createdAt));

  const allDocs =
    cases.length > 0
      ? await db
          .select({
            caseId: tikiaDocuments.caseId,
            docType: tikiaDocuments.docType,
            status: tikiaDocuments.status,
          })
          .from(tikiaDocuments)
      : [];

  const docsByCaseId = new Map<string, typeof allDocs>();
  for (const d of allDocs) {
    const arr = docsByCaseId.get(d.caseId) ?? [];
    arr.push(d);
    docsByCaseId.set(d.caseId, arr);
  }

  const activeCases = cases.filter((c) => c.status !== "archived");
  const archivedCases = cases.filter((c) => c.status === "archived");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">תיקיה</h1>
          <p className="text-sm text-foreground/60">
            {activeCases.length} תיקים פעילים
          </p>
        </div>
        <Link
          href="/admin/tikia/new"
          className="rounded-lg bg-button px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          תיק חדש +
        </Link>
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">תיקים פעילים</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-right text-sm">
            <thead>
              <tr className="border-b border-black/5 text-foreground/60">
                <th className="py-2">לקוח</th>
                <th className="py-2">סוג תיק</th>
                <th className="py-2">מסמכים</th>
                <th className="py-2">סטטוס</th>
                <th className="py-2">נוצר</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {activeCases.map((c) => {
                const caseDocs = docsByCaseId.get(c.id) ?? [];
                const identifiedTypes = new Set(
                  caseDocs
                    .filter(
                      (d) =>
                        d.status === "identified" ||
                        d.status === "pushed"
                    )
                    .map((d) => d.docType)
                    .filter(Boolean)
                );
                const received = c.requiredDocTypes.filter((t) =>
                  identifiedTypes.has(t)
                ).length;
                const total = c.requiredDocTypes.length;
                const pct = total > 0 ? Math.round((received / total) * 100) : 0;

                return (
                  <tr key={c.id} className="border-b border-black/5">
                    <td className="py-2">
                      <Link
                        href={`/admin/tikia/${c.id}`}
                        className="font-medium text-button hover:underline"
                      >
                        {c.clientName}
                      </Link>
                    </td>
                    <td className="py-2">{c.caseType || "—"}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct === 100
                                  ? "#2E8B57"
                                  : pct > 0
                                    ? "#D4AF37"
                                    : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs text-foreground/60">
                          {received}/{total}
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          c.status === "complete"
                            ? "text-emerald-700"
                            : "text-foreground/60"
                        }
                      >
                        {c.status === "active"
                          ? "פעיל"
                          : c.status === "complete"
                            ? "הושלם"
                            : "בארכיון"}
                      </span>
                    </td>
                    <td className="py-2 text-foreground/60">
                      {c.createdAt.toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-2">
                      <form action={archiveCaseAction.bind(null, c.id)}>
                        <button className="text-xs text-foreground/50 hover:text-button">
                          ארכיון
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {activeCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-foreground/50">
                    אין תיקים פעילים.{" "}
                    <Link
                      href="/admin/tikia/new"
                      className="text-button hover:underline"
                    >
                      צור תיק חדש
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {archivedCases.length > 0 && (
        <section className="rounded-2xl border border-black/5 bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">
            ארכיון ({archivedCases.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-right text-sm">
              <thead>
                <tr className="border-b border-black/5 text-foreground/60">
                  <th className="py-2">לקוח</th>
                  <th className="py-2">סוג תיק</th>
                  <th className="py-2">נוצר</th>
                </tr>
              </thead>
              <tbody>
                {archivedCases.map((c) => (
                  <tr key={c.id} className="border-b border-black/5">
                    <td className="py-2">
                      <Link
                        href={`/admin/tikia/${c.id}`}
                        className="text-foreground/60 hover:underline"
                      >
                        {c.clientName}
                      </Link>
                    </td>
                    <td className="py-2 text-foreground/60">
                      {c.caseType || "—"}
                    </td>
                    <td className="py-2 text-foreground/60">
                      {c.createdAt.toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
