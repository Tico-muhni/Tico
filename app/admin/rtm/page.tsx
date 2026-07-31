import { asc, desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import GenerateRtmNowForm from "./generate-now-form";
import RtmBriefCard, { type RtmBriefView } from "./brief-card";

export default async function RtmPage() {
  const session = await auth();

  const [lastRun] = await db
    .select()
    .from(rtmRuns)
    .orderBy(desc(rtmRuns.runAt))
    .limit(1);

  const rows = lastRun
    ? await db
        .select({
          id: rtmBriefs.id,
          rank: rtmBriefs.rank,
          status: rtmBriefs.status,
          whatHappened: rtmBriefs.whatHappened,
          meaningForMortgageHolders: rtmBriefs.meaningForMortgageHolders,
          closingQuestion: rtmBriefs.closingQuestion,
          source: rtmNewsItems.source,
          title: rtmNewsItems.title,
          url: rtmNewsItems.url,
          publishedAt: rtmNewsItems.publishedAt,
        })
        .from(rtmBriefs)
        .innerJoin(rtmNewsItems, eq(rtmBriefs.newsItemId, rtmNewsItems.id))
        .where(eq(rtmNewsItems.runId, lastRun.id))
        .orderBy(asc(rtmBriefs.rank))
    : [];

  const briefs: RtmBriefView[] = rows.map((row) => ({
    id: row.id,
    rank: row.rank,
    source: row.source,
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    whatHappened: row.whatHappened,
    meaningForMortgageHolders: row.meaningForMortgageHolders,
    closingQuestion: row.closingQuestion,
    status: row.status,
  }));

  return (
    <div className="min-h-full" style={{ backgroundColor: "#EDF6F0" }}>
      <header
        className="flex items-center justify-between gap-3 px-5 py-4 text-white"
        style={{ backgroundColor: "#2E8B57" }}
      >
        <div>
          <h1 className="text-lg font-extrabold text-white">
            RTM · <span style={{ color: "#F2D888" }}>3 הכתבות של היום</span>
          </h1>
          <p className="text-xs text-white/85">
            חדשות מכל האינטרנט בנושאי משכנתאות · ריבית · נדל&quot;ן
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-white/85">
          {session?.user?.email && (
            <span className="max-w-[9rem] truncate">{session.user.email}</span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="font-medium underline-offset-2 hover:underline">
              התנתקות
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
        <section
          className="rounded-2xl border p-5 shadow-sm"
          style={{ borderColor: "#D5E5DC", backgroundColor: "#ffffff" }}
        >
          <GenerateRtmNowForm />
          {lastRun && (
            <p className="mt-3 text-xs" style={{ color: "#5B6B62" }}>
              סריקה אחרונה: {lastRun.runAt.toLocaleString("he-IL")} ·{" "}
              {lastRun.status === "success"
                ? `${lastRun.briefsGenerated} כתבות נבחרו מתוך ${lastRun.itemsFound} רלוונטיות`
                : lastRun.status === "failed"
                  ? `נכשלה: ${lastRun.error ?? ""}`
                  : "רצה כרגע..."}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          {briefs.length === 0 && (
            <p
              className="rounded-2xl bg-white p-6 text-center text-sm shadow-sm"
              style={{ color: "#5B6B62" }}
            >
              אין עדיין בריפים. לחצו על &quot;סרוק חדשות עכשיו&quot; כדי לקבל
              את 3 הכתבות הראשונות.
            </p>
          )}
          {briefs.map((brief) => (
            <RtmBriefCard key={brief.id} brief={brief} />
          ))}
        </section>

        <p className="text-center text-xs" style={{ color: "#8A968F" }}>
          הפלט המובנה זמין גם ב-JSON תחת{" "}
          <code dir="ltr">/api/rtm/briefs</code>
        </p>
      </main>
    </div>
  );
}
