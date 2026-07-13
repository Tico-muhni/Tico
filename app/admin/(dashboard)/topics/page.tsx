import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { topics } from "@/drizzle/schema";
import AddTopicForm from "./add-topic-form";
import GenerateNowForm from "./generate-now-form";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  used: "נוצר ממנו תוכן",
  skipped: "דולג",
};

const SOURCE_LABEL: Record<string, string> = {
  seed: "בסיס",
  ai_suggested: "הצעת AI",
  manual: "ידני",
};

export default async function TopicsPage() {
  const all = await db.select().from(topics).orderBy(desc(topics.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">נושאים</h1>
        <p className="text-sm text-foreground/60">
          נושאי בסיס נטענים אוטומטית בפעם הראשונה שיוצרים תוכן. אפשר להוסיף
          נושאים משלכם כאן.
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">יצירת תוכן עכשיו</h2>
        <GenerateNowForm />
      </section>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">הוספת נושא</h2>
        <AddTopicForm />
      </section>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">כל הנושאים</h2>
        <ul className="divide-y divide-black/5 text-sm">
          {all.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span>{t.title}</span>
              <span className="flex gap-3 text-foreground/50">
                <span>{SOURCE_LABEL[t.source]}</span>
                <span>{STATUS_LABEL[t.status]}</span>
              </span>
            </li>
          ))}
          {all.length === 0 && (
            <li className="py-6 text-center text-foreground/50">
              עדיין אין נושאים - לחצו על &quot;צור טיוטות עכשיו&quot; כדי לטעון
              את רשימת הבסיס וליצור תוכן ראשוני.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
