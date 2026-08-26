import { getBriefModel } from "./rtm-brief";
import { COMPLIANCE_RULES } from "./anthropic";

const HUMANIZER_SYSTEM = `
אתה קופירייטר ישראלי מנוסה שכותב פוסטים לרשתות חברתיות עבור יועץ משכנתאות.

הסגנון שלך:
- כותב כמו בן אדם אמיתי, לא כמו AI. בלי ניסוחים מלוטשים מדי, בלי מילות באז ריקות.
- משתמש בעברית יומיומית, עם שפה מדוברת ("אז ככה", "בואו נדבר על", "יאללה").
- משלב אמוג'י בטעם - לא מוגזם, 2-3 אמוג'י רלוונטיים מקסימום.
- שובר שורות בצורה טבעית - לא פסקאות ארוכות.
- לפעמים פותח בשאלה ישירה לקורא.
- משתמש בסלנג ישראלי במידה (לא צה"לי, לא זול - עדין).
- לא מפחד מניסוחים לא "מושלמים" - זה מה שעושה את זה אמיתי.
- לא מתחיל כל משפט באותו מבנה, לא חוזר על אותן מילים.
- הטון: חבר'מן מקצועי שמבין בתחום ורוצה לעזור, לא "מומחה מרחוק".

דברים שאתה לא עושה לעולם:
- לא כותב "בעולם המודרני", "בעידן הנוכחי", "בתקופה המאתגרת".
- לא משתמש ב"הינו/הינם/הינה" - עברית מדוברת בלבד.
- לא כותב רשימות עם 🔹 או ✅ באופן מוגזם.
- לא מתחיל עם "שלום לכולם!" או "היי חברים!".
- לא כותב ביטויים כמו "ללא ספק", "חשוב לציין", "יש לשים לב".
- לא מסיים עם "מה דעתכם?" בכל פוסט.

${COMPLIANCE_RULES}
`.trim();

export type HumanizedCaption = {
  captionFacebook: string;
  captionInstagram: string;
  hashtags: string[];
};

const GRAPH_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generateHumanizedCaption(
  imageDescription: string,
  apiKeyOverride?: string | null
): Promise<HumanizedCaption> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "אין מפתח Gemini. הוסיפו מפתח בהרשמה (חינמי, בלי כרטיס אשראי)."
    );
  }

  const model = getBriefModel();

  const userPrompt = `כתוב כיתובים לפוסט שיווקי באינסטגרם ובפייסבוק עבור יועץ משכנתאות.

תיאור התמונה/הנושא: "${imageDescription}"

תכתוב כאילו אתה יועץ המשכנתאות בעצמו - בגוף ראשון, בשפה יומיומית וטבעית.
הטקסט צריך לעבוד יחד עם התמונה שכבר קיימת.

החזר אך ורק אובייקט JSON תקין עם בדיוק שלושת המפתחות הבאים:
- "captionFacebook": כיתוב לפייסבוק בעברית. 2-4 פסקאות קצרות, שיחתי, קול אנושי. כלול הסתייגות בסוף.
- "captionInstagram": כיתוב לאינסטגרם בעברית. קצר וחד יותר מפייסבוק. כלול הסתייגות בסוף.
- "hashtags": מערך של 5-8 האשטגים רלוונטיים בעברית/אנגלית, בלי סימן #.`;

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: HUMANIZER_SYSTEM }],
    },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8,
      maxOutputTokens: 5000,
    },
  });

  const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
  const MAX_ATTEMPTS = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `${GRAPH_BASE}/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini did not return any content.");
      }
      return extractCaptionJson(text);
    }

    const body = await res.text();
    lastError = `Gemini API error ${res.status}: ${body.slice(0, 300)}`;

    if (!TRANSIENT_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(lastError);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }

  throw new Error(lastError);
}

function extractCaptionJson(text: string): HumanizedCaption {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as Partial<HumanizedCaption>;
  if (!parsed.captionFacebook || !parsed.captionInstagram || !parsed.hashtags) {
    throw new Error("Gemini response missing required caption fields.");
  }
  return parsed as HumanizedCaption;
}
