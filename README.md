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

## RTM - בריפים יומיים מהחדשות

מודול נוסף שסורק אחת ליום חדשות מכל האינטרנט (דרך חיפוש Google News)
בנושאי משכנתאות/ריבית/נדל"ן, ומכין לכל ידיעה רלוונטית בריף ל-AI
לסרטון אינסטגרם: מה קרה, מה זה אומר למחזיקי משכנתא, ושאלת סיום.

- `lib/rtm-news-sources.ts` - שאילתות החיפוש (Google News) ומילות המפתח לסינון.
- `lib/rtm-rss.ts` - שליפה ופענוח RSS (כולל שם המקור מ-Google News).
- `lib/rtm-brief.ts` - יצירת הבריף המובנה בעזרת Google Gemini (רמה חינמית, בלי כרטיס אשראי).
- `lib/generate-rtm-briefs.ts` - הרצת הסבב המלא (חיפוש → סינון → דירוג → AI → שמירה).
- `app/admin/rtm` - הפאנל להצגה, אישור ודחייה של בריפים.
- `app/api/rtm/briefs` - אותו מידע כ-JSON מובנה (`GET`, מוגן ב-session
  או ב-`Authorization: Bearer <RTM_API_SECRET>`).
- `app/api/cron/rtm-briefs` - קרון יומי (05:00 UTC, ר' `vercel.json`).

המקורות אינם רשימה קבועה של אתרים אלא כל מה ש-Google News מאנדקס -
כך אין תלות בכתובות RSS של אתר ספציפי שעלולות להשתנות. שם המקור של
כל כתבה (Ynet, גלובס, כלכליסט, TheMarker וכו') נשמר ומוצג.
