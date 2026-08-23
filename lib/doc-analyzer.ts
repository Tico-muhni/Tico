import { getBriefModel } from "./rtm-brief";

export const DOC_TYPE_REGISTRY = [
  {
    key: "payslip",
    label: "תלוש משכורת",
    fields: ["employer", "employeeName", "grossSalary", "netSalary", "month", "year"],
  },
  {
    key: "form_106",
    label: "טופס 106",
    fields: ["taxYear", "employer", "totalIncome", "taxPaid", "pensionContributions"],
  },
  {
    key: "balance_cert",
    label: "אישור יתרת משכנתא",
    fields: ["bank", "balance", "monthlyPayment", "interestRate", "endDate"],
  },
  {
    key: "bank_statement",
    label: "תדפיס בנק",
    fields: ["bank", "accountNumber", "period", "closingBalance"],
  },
  {
    key: "land_registry",
    label: "נסח טאבו",
    fields: ["address", "block", "parcel", "owners"],
  },
] as const;

export type DocTypeKey = (typeof DOC_TYPE_REGISTRY)[number]["key"];

export type DocAnalysisResult = {
  docType: DocTypeKey | "unknown";
  docTypeLabel: string;
  confidence: number;
  extractedFields: Record<string, string>;
};

const SYSTEM_PROMPT = `
אתה מערכת לזיהוי מסמכים פיננסיים ישראליים בתחום המשכנתאות.

קיבלת תמונה או PDF של מסמך. עליך:
1. לזהות את סוג המסמך
2. לשלוף נתונים מרכזיים

סוגי המסמכים שאתה מכיר:
- payslip (תלוש משכורת): שדות — employer (שם מעסיק), employeeName (שם עובד), grossSalary (ברוטו בש"ח), netSalary (נטו בש"ח), month (חודש), year (שנה)
- form_106 (טופס 106): שדות — taxYear (שנת מס), employer (מעסיק), totalIncome (הכנסה שנתית בש"ח), taxPaid (מס ששולם בש"ח), pensionContributions (הפרשות פנסיה בש"ח)
- balance_cert (אישור יתרת משכנתא): שדות — bank (בנק), balance (יתרה בש"ח), monthlyPayment (החזר חודשי בש"ח), interestRate (ריבית), endDate (תום תקופה)
- bank_statement (תדפיס בנק): שדות — bank (בנק), accountNumber (מספר חשבון), period (תקופה), closingBalance (יתרת סגירה בש"ח)
- land_registry (נסח טאבו): שדות — address (כתובת הנכס), block (גוש), parcel (חלקה), owners (בעלים)

אם המסמך לא ברור או לא מתאים לאף סוג, החזר docType: "unknown".
ערכי השדות צריכים להיות מחרוזות. לסכומים כספיים — כלול את המספר בלבד (ללא סימן מטבע).

החזר אך ורק JSON תקין במבנה הבא (בלי טקסט נוסף):
{
  "docType": "payslip",
  "docTypeLabel": "תלוש משכורת",
  "confidence": 0.95,
  "extractedFields": {
    "employer": "...",
    "grossSalary": "18500",
    "netSalary": "14200",
    ...
  }
}

אם לא הצלחת לקרוא שדה מסוים, השמט אותו מה-JSON. עדיף להשמיט שדה מאשר לנחש ערך שגוי.
`.trim();

function extractJson(text: string): DocAnalysisResult {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as Partial<DocAnalysisResult>;

  if (!parsed.docType) {
    throw new Error("Gemini response missing docType field.");
  }

  const entry = DOC_TYPE_REGISTRY.find((d) => d.key === parsed.docType);

  return {
    docType: (parsed.docType as DocAnalysisResult["docType"]) || "unknown",
    docTypeLabel: parsed.docTypeLabel || entry?.label || "לא ידוע",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    extractedFields: parsed.extractedFields || {},
  };
}

export async function analyzeDocument(
  imageBuffer: Buffer,
  mimeType: string,
  geminiApiKey?: string | null
): Promise<DocAnalysisResult> {
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "אין מפתח Gemini. הוסיפו מפתח בהרשמה (חינמי, בלי כרטיס אשראי)."
    );
  }

  const base64 = imageBuffer.toString("base64");
  const model = getBriefModel();

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: "זהה את המסמך הזה ושלוף ממנו את הנתונים המרכזיים.",
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 3000,
    },
  });

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
        throw new Error("Gemini did not return any content for document analysis.");
      }
      return extractJson(text);
    }

    const body = await res.text();
    lastError = `Gemini API error ${res.status}: ${body.slice(0, 300)}`;

    if (!TRANSIENT_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(lastError);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }

  throw new Error(lastError);
}
