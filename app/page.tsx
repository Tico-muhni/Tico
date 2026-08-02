import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <main className="flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border border-black/5 bg-surface px-10 py-14 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">
          Tico | מערכת שיווק אוטומטית
        </h1>
        <p className="text-foreground/80">
          יצירת תוכן שיווקי אוטומטית, אישור לפני פרסום, ושליחה לרשתות
          החברתיות ולרשימת התפוצה.
        </p>
        <Link
          href="/admin/login"
          className="rounded-full bg-button px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          כניסה לפאנל הניהול
        </Link>
        <Link
          href="/lottery-calculator"
          className="text-sm font-medium text-primary underline transition-opacity hover:opacity-80"
        >
          מחשבון הגרלות דיור
        </Link>
      </main>
    </div>
  );
}
