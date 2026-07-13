import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/drizzle/schema";
import AddSubscriberForm from "./add-subscriber-form";
import ImportCsvForm from "./import-csv-form";
import { deactivateSubscriberAction, reactivateSubscriberAction } from "./actions";

export default async function SubscribersPage() {
  const all = await db
    .select()
    .from(subscribers)
    .orderBy(desc(subscribers.importedAt));

  const activeCount = all.filter((s) => s.status === "active").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">רשימת תפוצה</h1>
        <p className="text-sm text-foreground/60">
          {activeCount} נמענים פעילים מתוך {all.length}
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">ייבוא מקובץ CSV</h2>
        <ImportCsvForm />
      </section>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">הוספה ידנית</h2>
        <AddSubscriberForm />
      </section>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">כל הנמענים</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-right text-sm">
            <thead>
              <tr className="border-b border-black/5 text-foreground/60">
                <th className="py-2">אימייל</th>
                <th className="py-2">שם</th>
                <th className="py-2">מקור</th>
                <th className="py-2">סטטוס</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((s) => (
                <tr key={s.id} className="border-b border-black/5">
                  <td className="py-2">{s.email}</td>
                  <td className="py-2">
                    {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-2">
                    {s.source === "csv_import" ? "ייבוא CSV" : "ידני"}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        s.status === "active"
                          ? "text-emerald-700"
                          : "text-foreground/50"
                      }
                    >
                      {s.status === "active" ? "פעיל" : s.status === "unsubscribed" ? "הוסר" : "החזרה"}
                    </span>
                  </td>
                  <td className="py-2">
                    {s.status === "active" ? (
                      <form action={deactivateSubscriberAction.bind(null, s.id)}>
                        <button className="text-xs text-button hover:underline">
                          הסרה
                        </button>
                      </form>
                    ) : (
                      <form action={reactivateSubscriberAction.bind(null, s.id)}>
                        <button className="text-xs text-secondary hover:underline">
                          שחזור
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-foreground/50">
                    אין עדיין נמענים ברשימה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
