
// RTM briefs are generated with Google's Gemini API, which has a genuinely
// free tier (no credit card required) - see SETUP.md. This keeps the daily
// news tool free to run. The main marketing pipeline still uses Anthropic
// (lib/anthropic.ts); the two are independent.

const RTM_BUSINESS_CONTEXT = `
העסק הוא ייעוץ משכנתאות פרטי בישראל. המטרה כאן היא הכנת בריפים יומיים
לסרטוני אינסטגרם (RTM - שיווק בזמן אמת) על בסיס ידיעות חדשות בנושאי
משכנתאות, ריבית ונדל"ן. קהל היעד: זוגות צעירים ורוכשי דירה, וגם מי
שכבר יש לו משכנתא ורוצה להבין איך חדשות עדכניות משפיעות עליו.
`.trim();

// Kept in sync with the compliance rules used by the marketing pipeline
// (lib/anthropic.ts) - duplicated here so the RTM tool stays independent of
// the Anthropic module and its API key.
const RTM_COMPLIANCE_RULES = `
כללי ציות מחייבים (תוכן בתחום ייעוץ פיננסי מפוקח):
- אין להבטיח תוצאה, ריבית, אישור הלוואה או רווח.
- אין לציין מספרי ריבית/החזר קונקרטיים כהבטחה - ניתן להשתמש בטווחים כלליים ובניסוח "משתנה לפי מקרה".
- התוכן צריך להיות אינפורמטיבי-כללי (חינוך פיננסי), לא ייעוץ אישי מחייב.
- טון: מקצועי, אמין, חם - לא "מכירתי" אגרסיבי.
`.trim();

// NOTE: the JSON keys stay the same (whatHappened / meaningForMortgageHolders /
// closingQuestion) so no DB migration is needed, but their ROLE is now a
// video-native hook -> spoken script -> lead-driving CTA. Everything is written
// in second person ("אתה").
const OUTPUT_INSTRUCTIONS = `
החזר אך ורק אובייקט JSON תקין (בלי טקסט נוסף לפניו או אחריו) עם בדיוק
שלושת המפתחות הבאים, כולם בעברית ובפנייה בגוף שני ("אתה", "יש לך"):

- "whatHappened": הוק פתיחה לסרטון - משפט אחד קצר וחד (3 השניות
  הראשונות) שנועד לעצור את הגלילה ולגרום לצופה להישאר. חייב להיות ממש
  מעניין או מסקרן: שאלה שנוגעת בכאב, אמירה מפתיעה, או פתיח בסגנון
  "עצור אם..." שמדבר ישירות למי שיש לו משכנתא. אל תסכם פה את החדשות -
  התפקיד היחיד הוא לתפוס תשומת לב.

- "meaningForMortgageHolders": גוף התסריט המדובר - מיני-תסריט של 4-6
  משפטים שהיועץ קורא מול המצלמה, בטון חם וזורם בגוף שני. פותח בקצרה מה
  קרה בידיעה, וממשיך למה זה אומר עליך בפועל אם יש לך משכנתא או שאתה
  עומד לקחת - עם דוגמה מוחשית אחת (סוג מסלול, בדיקה שכדאי לעשות, או צעד
  אפשרי). בלי להבטיח ריבית/אישור/תוצאה, ובלי מספרים קונקרטיים כהבטחה.

- "closingQuestion": קריאה לפעולה ברורה וישירה שמובילה לפנייה אישית
  (ליד) - לא סתם "כתוב בתגובות". בגוף שני, עם פעולה קונקרטית אחת
  שהצופה יכול לעשות עכשיו, בסגנון: "יש לך מסלול פריים במשכנתה? שלח לי
  דוח יתרות ונבדוק ביחד איך אפשר לחסוך". התאם את הפעולה לנושא הידיעה.
  בלי להבטיח חיסכון/תוצאה מובטחת.
`.trim();

export function getBriefModel() {
  // "-latest" auto-resolves to the current Gemini Flash model, so this keeps
  // working when a specific dated version is retired. Override with GEMINI_MODEL.
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

export type GeneratedRtmBrief = {
  whatHappened: string;
  meaningForMortgageHolders: string;
  closingQuestion: string;
};

function extractJson(text: string): GeneratedRtmBrief {
  // Gemini in JSON mode returns a bare JSON object, but strip any stray code
  // fences just in case, then parse.
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as Partial<GeneratedRtmBrief>;
  if (
    !parsed.whatHappened ||
    !parsed.meaningForMortgageHolders ||
    !parsed.closingQuestion
  ) {
    throw new Error("Gemini response missing required brief fields.");
  }
  return parsed as GeneratedRtmBrief;
}

export async function generateRtmBrief(
  newsItem: {
    source: string;
    title: string;
    summary: string | null;
  },
  // Each advisor supplies their own Gemini key at registration, so briefs run
  // on their own quota. Falls back to a shared env key if provided.
  apiKeyOverride?: string | null
): Promise<GeneratedRtmBrief> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "אין מפתח Gemini. הוסיפו מפתח בהרשמה (חינמי, בלי כרטיס אשראי)."
    );
  }

  const model = getBriefModel();
  const userPrompt = `ידיעה מ-${newsItem.source}:
כותרת: ${newsItem.title}
${newsItem.summary ? `תקציר: ${newsItem.summary}` : ""}

הכן בריף קצר לסרטון אינסטגרם על בסיס הידיעה הזו.

${OUTPUT_INSTRUCTIONS}`;

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: `${RTM_BUSINESS_CONTEXT}\n\n${RTM_COMPLIANCE_RULES}` }],
    },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      // The default Gemini Flash model "thinks" before answering, and that
      // reasoning is billed against maxOutputTokens. A low budget (e.g. 800)
      // gets consumed by thinking, truncating the JSON answer into invalid
      // JSON. The meaning section is now a longer mini-script, so give extra
      // room for the thinking plus the output.
      maxOutputTokens: 5000,
    },
  });

  // The free tier occasionally returns 429 (rate limit) or 503 (model
  // overloaded / high demand). Those are transient, so retry a couple of
  // times with a short backoff before giving up.
  const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
  const MAX_ATTEMPTS = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        throw new Error("Gemini did not return a structured RTM brief.");
      }
      return extractJson(text);
    }

    const body = await res.text();
    lastError = `Gemini API error ${res.status}: ${body.slice(0, 300)}`;

    // Only retry transient errors, and not after the final attempt.
    if (!TRANSIENT_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(lastError);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }

  throw new Error(lastError);
}
