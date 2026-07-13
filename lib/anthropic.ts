import Anthropic from "@anthropic-ai/sdk";

const BUSINESS_CONTEXT = `
העסק הוא ייעוץ משכנתאות פרטי בישראל. קהל היעד: זוגות צעירים ורוכשי דירה
ראשונה/שנייה שרוצים להבין את תהליך המשכנתא.
`.trim();

const COMPLIANCE_RULES = `
כללי ציות מחייבים (תוכן בתחום ייעוץ פיננסי מפוקח):
- אין להבטיח תוצאה, ריבית, אישור הלוואה או רווח ("נבטיח לך ריבית הכי נמוכה" אסור).
- אין לציין מספרי ריבית/החזר קונקרטיים כהבטחה - ניתן להשתמש בטווחים כלליים ובניסוח "משתנה לפי מקרה".
- התוכן צריך להיות אינפורמטיבי-כללי (חינוך פיננסי), לא ייעוץ אישי מחייב.
- יש לכלול בסוף כל פוסט/מייל משפט קצר בסגנון: "המידע כללי ואינו מהווה ייעוץ פיננסי מחייב - מומלץ להתייעץ אישית."
- טון: מקצועי, אמין, חם - לא "מכירתי" אגרסיבי.
`.trim();

export type GeneratedDraft = {
  post: {
    captionFacebook: string;
    captionInstagram: string;
    hashtags: string[];
    overlayText: string;
  };
  email: {
    subject: string;
    bodyHtml: string;
    bodyText: string;
  };
};

const DRAFT_TOOL_NAME = "emit_marketing_draft";

const DRAFT_TOOL_SCHEMA = {
  name: DRAFT_TOOL_NAME,
  description:
    "Emit a structured marketing draft (social post + nurture email) for the given topic.",
  input_schema: {
    type: "object" as const,
    properties: {
      post: {
        type: "object",
        properties: {
          captionFacebook: {
            type: "string",
            description: "Facebook post caption in Hebrew, 2-5 short paragraphs.",
          },
          captionInstagram: {
            type: "string",
            description: "Instagram caption in Hebrew, punchier and shorter than Facebook.",
          },
          hashtags: {
            type: "array",
            items: { type: "string" },
            description: "5-8 relevant Hebrew/English hashtags, no # prefix.",
          },
          overlayText: {
            type: "string",
            description:
              "A short punchy Hebrew headline (max ~8 words) that will be rendered as large text on top of a background photo, like a quote card. Must stand alone without the rest of the caption.",
          },
        },
        required: ["captionFacebook", "captionInstagram", "hashtags", "overlayText"],
      },
      email: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Email subject line in Hebrew." },
          bodyHtml: {
            type: "string",
            description: "Email body as simple HTML (p/strong/ul/li tags only).",
          },
          bodyText: { type: "string", description: "Plain-text version of the email body." },
        },
        required: ["subject", "bodyHtml", "bodyText"],
      },
    },
    required: ["post", "email"],
  },
};

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to your environment (see SETUP.md)."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function getContentModel() {
  return process.env.ANTHROPIC_CONTENT_MODEL || "claude-sonnet-5";
}

export async function generateDraftForTopic(
  topic: string
): Promise<GeneratedDraft> {
  const model = getContentModel();
  const message = await getClient().messages.create({
    model,
    max_tokens: 2000,
    system: `${BUSINESS_CONTEXT}\n\n${COMPLIANCE_RULES}`,
    tools: [DRAFT_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: DRAFT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `כתוב טיוטת תוכן שיווקי (פוסט לפייסבוק/אינסטגרם + מייל תזכורת ללקוחות קודמים) בנושא: "${topic}".`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured draft.");
  }

  return toolUse.input as GeneratedDraft;
}
