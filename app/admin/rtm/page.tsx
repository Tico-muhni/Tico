import { asc, desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import { RTM_SOURCE_LABEL } from "@/lib/rtm-news-sources";
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
    sourceLabel: RTM_SOURCE_LABEL[row.source],
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    whatHappened: row.whatHappened,
    meaningForMortgageHolders: row.meaningForMortgageHolders,
    closingQuestion: row.closingQuestion,
    status: row.status,
  }));

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0F243E05" }}>
      <header
        className="flex items-center justify-between px-6 py-4 text-white"
        style={{ backgroundColor: "#0F243E" }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#D4AF37" }}>
            RTM · 3 הכתבות של היום
          </h1>
          <p className="text-xs text-white/60">
            סריקה יומית של Ynet, גלובס וכלכליסט בנושאי משכנתאות/ריבית/נדל&quot;ן
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          {session?.user?.email && <span>{session.user.email}</span>}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="hover:text-white">
              התנתקות
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
        <section
          className="rounded-2xl border p-5"
          style={{ borderColor: "#0F243E22", backgroundColor: "#ffffff" }}
        >
          <GenerateRtmNowForm />
          {lastRun && (
            <p className="mt-2 text-xs text-foreground/50">
              סריקה אחרונה: {lastRun.runAt.toLocaleString("he-IL")} ·{" "}
              {lastRun.status === "success"
                ? `${lastRun.briefsGenerated} כתבות ריכוזיות מתוך ${lastRun.itemsFound} רלוונטיות שנמצאו`
                : lastRun.status === "failed"
                  ? `נכשלה: ${lastRun.error ?? ""}`
                  : "רצה כרגע..."}
              {lastRun.feedErrors.length > 0 && (
                <> · אזהרות: {lastRun.feedErrors.join("; ")}</>
              )}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          {briefs.length === 0 && (
            <p className="text-center text-sm text-foreground/50">
              אין עדיין בריפים. לחצו על &quot;סרוק חדשות עכשיו&quot; כדי לקבל
              את 3 הכתבות הראשונות.
            </p>
          )}
          {briefs.map((brief) => (
            <RtmBriefCard key={brief.id} brief={brief} />
          ))}
        </section>

        <p className="text-center text-xs text-foreground/40">
          הפלט המובנה זמין גם ב-JSON תחת{" "}
          <code dir="ltr">/api/rtm/briefs</code>
        </p>
      </main>
    </div>
  );
}
