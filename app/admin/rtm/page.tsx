import { desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import GenerateRtmNowForm from "./generate-now-form";
import RtmBriefCard, { type RtmBriefView } from "./brief-card";
import CandidateRow, { type CandidateView } from "./candidate-row";

export default async function RtmPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Only show this advisor's latest scan - each new scan replaces the board, so
  // there's no history to scroll past. Each item is either a candidate to brief
  // or a brief already made.
  const [lastRun] = userId
    ? await db
        .select({ id: rtmRuns.id })
        .from(rtmRuns)
        .where(eq(rtmRuns.userId, userId))
        .orderBy(desc(rtmRuns.runAt))
        .limit(1)
    : [];

  const rows = lastRun
    ? await db
        .select({
          newsItemId: rtmNewsItems.id,
          source: rtmNewsItems.source,
          title: rtmNewsItems.title,
          url: rtmNewsItems.url,
          publishedAt: rtmNewsItems.publishedAt,
          briefId: rtmBriefs.id,
          status: rtmBriefs.status,
          whatHappened: rtmBriefs.whatHappened,
          meaningForMortgageHolders: rtmBriefs.meaningForMortgageHolders,
          closingQuestion: rtmBriefs.closingQuestion,
        })
        .from(rtmNewsItems)
        .leftJoin(rtmBriefs, eq(rtmBriefs.newsItemId, rtmNewsItems.id))
        .where(eq(rtmNewsItems.runId, lastRun.id))
        .orderBy(desc(rtmNewsItems.publishedAt))
    : [];

  const briefs: RtmBriefView[] = [];
  const candidates: CandidateView[] = [];

  for (const row of rows) {
    const publishedAt = row.publishedAt ? row.publishedAt.toISOString() : null;
    if (row.briefId && row.whatHappened) {
      // Dismissed briefs are hidden entirely - dismissing is how you clear a
      // brief off the board.
      if (row.status === "dismissed") continue;
      briefs.push({
        id: row.briefId,
        rank: 1,
        source: row.source,
        title: row.title,
        url: row.url,
        publishedAt,
        whatHappened: row.whatHappened,
        meaningForMortgageHolders: row.meaningForMortgageHolders ?? "",
        closingQuestion: row.closingQuestion ?? "",
        status: row.status ?? "new",
      });
    } else {
      candidates.push({
        id: row.newsItemId,
        source: row.source,
        title: row.title,
        url: row.url,
        publishedAt,
      });
    }
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: "#EDF6F0" }}>
      <header
        className="flex items-center justify-between gap-3 px-5 py-4 text-white"
        style={{ backgroundColor: "#2E8B57" }}
      >
        <div>
          <h1 className="text-lg font-extrabold text-white">
            RTM · <span style={{ color: "#F2D888" }}>חדשות היום</span>
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
          <p className="mt-3 text-xs" style={{ color: "#5B6B62" }}>
            הסריקה חינמית ובלי הגבלה. בחרו כתבה ולחצו &quot;צור בריף&quot; כדי
            שה-AI יכתוב לה בריף לסרטון.
          </p>
        </section>

        {briefs.length === 0 && candidates.length === 0 && (
          <p
            className="rounded-2xl bg-white p-6 text-center text-sm shadow-sm"
            style={{ color: "#5B6B62" }}
          >
            אין עדיין כתבות. לחצו על &quot;סרוק חדשות עכשיו&quot; כדי למצוא
            כתבות עדכניות.
          </p>
        )}

        {candidates.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold" style={{ color: "#0F243E" }}>
              כתבות שנמצאו — בחרו למי ליצור בריף ({candidates.length})
            </h2>
            {candidates.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </section>
        )}

        {briefs.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-extrabold" style={{ color: "#0F243E" }}>
              הבריפים שהכנת ({briefs.length})
            </h2>
            {briefs.map((brief) => (
              <RtmBriefCard key={brief.id} brief={brief} />
            ))}
          </section>
        )}

        <p className="text-center text-xs" style={{ color: "#8A968F" }}>
          הפלט המובנה זמין גם ב-JSON תחת{" "}
          <code dir="ltr">/api/rtm/briefs</code>
        </p>
      </main>
    </div>
  );
}
