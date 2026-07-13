# Tico - מערכת שיווק אוטומטית

מערכת ליצירת תוכן שיווקי אוטומטית (פוסטים + מיילים) עם אישור אנושי לפני
פרסום, פרסום לפייסבוק/אינסטגרם, ושליחה לרשימת תפוצה.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ומלאו את הערכים
npm run db:push              # יוצר את טבלאות מסד הנתונים
npm run dev
```

הפאנל: `http://localhost:3000/admin/login`

## הפעלה מלאה (חשבונות, מפתחות API, פריסה)

ראו [SETUP.md](./SETUP.md) - מדריך מלא לכל חשבון וקרדנציאל שצריך:
Vercel, Postgres, Anthropic, Resend, Meta (פייסבוק/אינסטגרם), Vercel
Blob.

## מבנה הפרויקט

- `drizzle/schema.ts` - מודל הנתונים.
- `lib/anthropic.ts`, `lib/generate-content.ts` - יצירת טיוטות תוכן.
- `lib/resend.ts` - שליחת מיילים.
- `lib/meta.ts` - פרסום לפייסבוק/אינסטגרם.
- `app/admin/(dashboard)/drafts` - פאנל האישור (הלב של המערכת - שום
  דבר לא יוצא לאוויר בלי אישור כאן).
- `app/unsubscribe` - הסרה מרשימת תפוצה (נדרש חוקית).
- `legacy/mortgage-calculator.jsx` - קובץ ישן מלפני המערכת הזו, נשמר
  כרפרנס בלבד ואינו חלק מהאפליקציה.
