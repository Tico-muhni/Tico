
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

// The brief can be generated in two styles the advisor picks per article:
//  - "article": react to the specific news item (classic RTM).
//  - "inspired": use the item only as a spark for an evergreen educational
//    video on the broader topic, aimed at identification + follows + leads.
// Both share the same JSON keys (no DB migration) and the same video-native
// shape: hook -> spoken script -> lead-driving CTA, all in second person.
export type BriefStyle = "article" | "inspired";

const ARTICLE_OUTPUT_INSTRUCTIONS = `
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

const INSPIRED_OUTPUT_INSTRUCTIONS = `
אל תסקר את הכתבה ואל תגיב לאירוע חדשותי. השתמש בכתבה רק כניצוץ להשראה:
זהה את הנושא הרחב והירוק-עד שהיא נוגעת בו (למשל מסלול פריים, תמהיל
משכנתא, מחירי דירות, ההחזר החודשי, מיחזור, ההון העצמי), ובנה סביבו
סרטון חינוכי כללי שאפשר להעלות מתי שלא יהיה - בלי להזכיר את הכתבה,
תאריך, נתון עדכני או אירוע חדשותי ספציפי.

המטרה: לגרום לצופה הנכון להזדהות ("זה בדיוק אני / המצב שלי"), לתת לו
ערך אמיתי שממצב אותך כמומחה שאפשר לסמוך עליו, ומתוך זה לגרום לו לעקוב
או לפנות - כדי לייצר טראפיק ולידים לעסק.

החזר אך ורק אובייקט JSON תקין (בלי טקסט נוסף) עם בדיוק שלושת המפתחות
הבאים, כולם בעברית ובפנייה בגוף שני ("אתה", "יש לך"):

- "whatHappened": הוק פתיחה - משפט אחד קצר וחד (3 השניות הראשונות)
  שעוצר את הגלילה, ומדבר ישירות לפרסונה עם כאב או רצון מוכר (למשל
  "אם אתה מרגיש שלעולם לא תצליח לקנות דירה - תישאר איתי 20 שניות").
  מסקרן, לא סיכום חדשות.

- "meaningForMortgageHolders": גוף התסריט המדובר - 4-6 משפטים בגוף שני,
  טון חם וזורם. פתח בזיהוי הפרסונה/המצב, ותן תובנה או טיפ אחד
  לא-מובן-מאליו שרוב האנשים לא יודעים וממצב אותך כמומחה. פרקטי
  וקונקרטי, בלי להבטיח ריבית/אישור/תוצאה ובלי מספרים קונקרטיים כהבטחה.

- "closingQuestion": קריאה לפעולה ברורה בגוף שני עם פעולה קונקרטית אחת -
  לעקוב לעוד תוכן כזה, או פנייה אישית לבדיקה (ליד), בסגנון "יש לך
  מסלול פריים? שלח לי דוח יתרות ונבדוק ביחד איך אפשר לחסוך". בלי
  להבטיח חיסכון/תוצאה מובטחת.
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
  apiKeyOverride?: string | null,
  // "article" reacts to the news item; "inspired" uses it as a spark for an
  // evergreen educational video. The advisor picks per article.
  style: BriefStyle = "article"
): Promise<GeneratedRtmBrief> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "אין מפתח Gemini. הוסיפו מפתח בהרשמה (חינמי, בלי כרטיס אשראי)."
    );
  }

  const instructions =
    style === "inspired"
      ? INSPIRED_OUTPUT_INSTRUCTIONS
      : ARTICLE_OUTPUT_INSTRUCTIONS;
  const task =
    style === "inspired"
      ? "בנה בריף לסרטון אינסטגרם בהשראת הידיעה הזו (לא עליה) - סרטון חינוכי כללי על הנושא הרחב."
      : "הכן בריף קצר לסרטון אינסטגרם על בסיס הידיעה הזו.";

  const model = getBriefModel();
  const userPrompt = `ידיעה מ-${newsItem.source}:
כותרת: ${newsItem.title}
${newsItem.summary ? `תקציר: ${newsItem.summary}` : ""}

${task}

${instructions}`;

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

  const text = await callGemini(apiKey, model, requestBody);
  return extractJson(text);
}

/**
 * Low-level Gemini call with retry on transient errors (429 / 5xx). Returns the
 * raw text of the first candidate. Shared by the brief and social-post
 * generators. The free tier occasionally returns 429 (rate limit) or 503
 * (overloaded); those are transient, so retry a couple of times with a short
 * backoff before giving up.
 */
async function callGemini(
  apiKey: string,
  model: string,
  requestBody: string
): Promise<string> {
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
        throw new Error("Gemini did not return any content.");
      }
      return text;
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

const SOCIAL_POST_INSTRUCTIONS = `
הפוך את הבריף הבא לפוסט כתוב מוכן לפרסום בסטטוס וואטסאפ או בפייסבוק - לא
תסריט מדובר, אלא טקסט שקוראים. בעברית, בגוף שני, בטון חם ואישי.

מבנה:
- שורת פתיחה שמושכת תשומת לב (על בסיס ההוק).
- כמה שורות קצרות של ערך, עם רווח בין שורות.
- שורת סיום עם קריאה לפעולה ברורה - להשאיר הודעה או לפנות לבדיקה אישית.

הכי חשוב - כתוב כמו אדם אמיתי שמקליד בוואטסאפ, לא כמו AI. הימנע לחלוטין
מ"סימני ההיכר" של טקסט מלאכותי:
- בלי קו מפריד ארוך (—). השתמש בנקודה, פסיק, או שורה חדשה.
- כמעט בלי אימוג'ים: אפס עד אחד בכל הפוסט, ורק אם זה ממש טבעי. לא אימוג'י
  בתחילת שורות.
- בלי מילות שיווק מנופחות ("מהפכני", "הסוד ש...", "טעות קריטית", "אין ספק",
  "חובה שתדע").
- בלי מבנים נוסחתיים כמו "זה לא X, זה Y", ובלי ערימה של שאלות רטוריות.
- בלי סופרלטיבים ובלי סימני קריאה מרובים.
- בלי האשטגים.
- משפטים קצרים ולפעמים לא-מושלמים, בשפה מדוברת יומיומית - כמו שאתה מדבר,
  לא כמו מאמר. גוון באורך המשפטים.
- בלי לסכם בסוף ובלי "לסיכום". תגיד את הדבר ותעצור.

קצר וקולח (מתאים לסטטוס וואטסאפ). בלי להבטיח ריבית/אישור/תוצאה/חיסכון
מובטח. החזר אך ורק את טקסט הפוסט, בלי הסברים ובלי מרכאות עוטפות.
`.trim();

/**
 * Adapt an already-generated video brief into a ready-to-paste written post for
 * a WhatsApp status or Facebook - the advisor's warm channels. Generated on
 * demand (not stored), so no schema change.
 */
export async function generateSocialPost(
  brief: GeneratedRtmBrief,
  apiKeyOverride?: string | null
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "אין מפתח Gemini. הוסיפו מפתח בהרשמה (חינמי, בלי כרטיס אשראי)."
    );
  }

  const userPrompt = `הבריף לסרטון:
הוק: ${brief.whatHappened}
תסריט: ${brief.meaningForMortgageHolders}
קריאה לפעולה: ${brief.closingQuestion}

${SOCIAL_POST_INSTRUCTIONS}`;

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: `${RTM_BUSINESS_CONTEXT}\n\n${RTM_COMPLIANCE_RULES}` }],
    },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "text/plain",
      temperature: 0.8,
      maxOutputTokens: 3000,
    },
  });

  const text = await callGemini(apiKey, getBriefModel(), requestBody);
  return humanizeSocialText(text);
}

/**
 * Backstop that strips the most reliable AI writing tells the prompt can't
 * fully prevent: em/en dashes and quotes wrapping the whole post.
 */
function humanizeSocialText(raw: string): string {
  let text = raw.trim();
  // Drop a pair of quotes wrapping the entire post.
  if (/^["'“”][\s\S]*["'“”]$/.test(text)) {
    text = text.slice(1, -1).trim();
  }
  // Replace em/en dashes (a classic AI tell) with a plain hyphen.
  text = text.replace(/\s*[—–]\s*/g, " - ");
  return text.trim();
}
