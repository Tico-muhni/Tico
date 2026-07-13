import Image from "next/image";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { imageTemplates } from "@/drizzle/schema";
import UploadTemplateForm from "./upload-template-form";
import {
  deleteTemplateAction,
  toggleTemplateActiveAction,
} from "./actions";

const ZONE_LABEL: Record<string, string> = {
  bottom: "טקסט למטה",
  top: "טקסט למעלה",
  left: "טקסט בצד שמאל",
  right: "טקסט בצד ימין",
};

export default async function TemplatesPage() {
  const all = await db
    .select()
    .from(imageTemplates)
    .orderBy(desc(imageTemplates.createdAt));

  const activeCount = all.filter((t) => t.active).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">תבניות תמונה</h1>
        <p className="text-sm text-foreground/60">
          העלו כמה תמונות רקע קבועות (משרד, תמונת פרופיל, נוף וכו&apos;).
          כשיש תבנית פעילה אחת לפחות, כל טיוטת פוסט חדשה תקבל אוטומטית
          תמונה - עם הכיתוב הראשי של הפוסט מעוצב מעליה - בלי צורך להעלות
          תמונה ידנית בכל פעם. {activeCount} תבניות פעילות כרגע.
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">הוספת תבנית</h2>
        <UploadTemplateForm />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((t) => (
          <div key={t.id} className="rounded-2xl border border-black/5 bg-surface p-4">
            <Image
              src={t.imageUrl}
              alt={t.label}
              width={300}
              height={300}
              unoptimized
              className="mb-3 h-40 w-full rounded-lg object-cover"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.label}</span>
              <span className={t.active ? "text-emerald-700" : "text-foreground/50"}>
                {t.active ? "פעילה" : "כבויה"}
              </span>
            </div>
            <div className="mt-1 text-xs text-foreground/50">
              {ZONE_LABEL[t.textZone]} · {t.textColor === "light" ? "טקסט בהיר" : "טקסט כהה"}
            </div>
            <div className="mt-3 flex gap-2">
              {t.active ? (
                <form action={toggleTemplateActiveAction.bind(null, t.id, false)}>
                  <button className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5">
                    כיבוי
                  </button>
                </form>
              ) : (
                <form action={toggleTemplateActiveAction.bind(null, t.id, true)}>
                  <button className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/5">
                    הפעלה
                  </button>
                </form>
              )}
              <form action={deleteTemplateAction.bind(null, t.id)}>
                <button className="rounded-full px-3 py-1 text-xs text-button hover:bg-button/10">
                  מחיקה
                </button>
              </form>
            </div>
          </div>
        ))}
        {all.length === 0 && (
          <p className="text-sm text-foreground/50">אין עדיין תבניות תמונה.</p>
        )}
      </section>
    </div>
  );
}
