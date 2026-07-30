import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rtmBriefs, rtmNewsItems, rtmRuns } from "@/drizzle/schema";
import { RTM_SOURCE_LABEL } from "@/lib/rtm-news-sources";
import GenerateRtmNowForm from "./generate-now-form";
import RtmBriefCard, { type RtmBriefView } from "./brief-card";

export default async function RtmPage() {
  const rows = await db
    .select({
      id: rtmBriefs.id,
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
    .orderBy(desc(rtmBriefs.generatedAt))
    .limit(30);

  const briefs: RtmBriefView[] = rows.map((row) => ({
    id: row.id,
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

  const [lastRun] = await db
    .select()
    .from(rtmRuns)
    .orderBy(desc(rtmRuns.runAt))
    .limit(1);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#0F243E" }}>
          RTM - בריפים יומיים מהחדשות
        </h1>
        <p className="text-sm text-foreground/60">
          סריקה אוטומטית של Ynet, גלובס וכלכליסט בנושאי משכנתאות, ריבית
          ונדל&quot;ן. לכל ידיעה רלוונטית: מה קרה, מה זה אומר למחזיקי
          משכנתא, ושאלת סיום לסרטון אינסטגרם. הפלט המובנה זמין גם ב-JSON
          תחת <code dir="ltr">/api/rtm/briefs</code>.
        </p>
      </div>

      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: "#0F243E22", backgroundColor: "#0F243E08" }}
      >
        <GenerateRtmNowForm />
        {lastRun && (
          <p className="mt-2 text-xs text-foreground/50">
            סריקה אחרונה: {lastRun.runAt.toLocaleString("he-IL")} ·{" "}
            {lastRun.status === "success"
              ? `נמצאו ${lastRun.itemsFound} ידיעות, נוצרו ${lastRun.briefsGenerated} בריפים`
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
          <p className="text-sm text-foreground/50">
            אין עדיין בריפים. לחצו על &quot;סרוק חדשות עכשיו&quot; כדי ליצור
            את הסבב הראשון.
          </p>
        )}
        {briefs.map((brief) => (
          <RtmBriefCard key={brief.id} brief={brief} />
        ))}
      </section>
    </div>
  );
}
