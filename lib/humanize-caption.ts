import Anthropic from "@anthropic-ai/sdk";
import { getClient, getContentModel, COMPLIANCE_RULES } from "./anthropic";

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

type HumanizedCaption = {
  captionFacebook: string;
  captionInstagram: string;
  hashtags: string[];
};

const HUMANIZE_TOOL = {
  name: "emit_captions",
  description: "Emit humanized social media captions for an image post.",
  input_schema: {
    type: "object" as const,
    properties: {
      captionFacebook: {
        type: "string",
        description:
          "Facebook caption in Hebrew. 2-4 short paragraphs, conversational, human voice. Include disclaimer at end.",
      },
      captionInstagram: {
        type: "string",
        description:
          "Instagram caption in Hebrew. Shorter and punchier than Facebook. Include disclaimer at end.",
      },
      hashtags: {
        type: "array",
        items: { type: "string" },
        description: "5-8 relevant Hebrew/English hashtags, no # prefix.",
      },
    },
    required: ["captionFacebook", "captionInstagram", "hashtags"],
  },
};

export async function generateHumanizedCaption(
  imageDescription: string
): Promise<HumanizedCaption> {
  const model = getContentModel();
  const message = await getClient().messages.create({
    model,
    max_tokens: 1500,
    system: HUMANIZER_SYSTEM,
    tools: [HUMANIZE_TOOL],
    tool_choice: { type: "tool", name: "emit_captions" },
    messages: [
      {
        role: "user",
        content: `כתוב כיתובים לפוסט שיווקי באינסטגרם ובפייסבוק עבור יועץ משכנתאות.

תיאור התמונה/הנושא: "${imageDescription}"

תכתוב כאילו אתה יועץ המשכנתאות בעצמו - בגוף ראשון, בשפה יומיומית וטבעית.
הטקסט צריך לעבוד יחד עם התמונה שכבר קיימת.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("AI did not return captions.");
  }

  return toolUse.input as HumanizedCaption;
}
