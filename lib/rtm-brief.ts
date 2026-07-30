import Anthropic from "@anthropic-ai/sdk";
import { getClient, getContentModel, COMPLIANCE_RULES } from "@/lib/anthropic";
import type { RtmSource } from "@/lib/rtm-news-sources";
import { RTM_SOURCE_LABEL } from "@/lib/rtm-news-sources";

const RTM_BUSINESS_CONTEXT = `
העסק הוא ייעוץ משכנתאות פרטי בישראל. המטרה כאן היא הכנת בריפים יומיים
לסרטוני אינסטגרם (RTM - שיווק בזמן אמת) על בסיס ידיעות חדשות בנושאי
משכנתאות, ריבית ונדל"ן. קהל היעד: זוגות צעירים ורוכשי דירה, וגם מי
שכבר יש לו משכנתא ורוצה להבין איך חדשות עדכניות משפיעות עליו.
`.trim();

const RTM_TOOL_NAME = "emit_rtm_brief";

const RTM_TOOL_SCHEMA = {
  name: RTM_TOOL_NAME,
  description:
    "Emit a structured real-time-marketing brief for a short Instagram video, based on one Israeli news item about mortgages, interest rates or real estate.",
  input_schema: {
    type: "object" as const,
    properties: {
      whatHappened: {
        type: "string",
        description:
          "1-2 short sentences in Hebrew, plain language, explaining what actually happened in the news item - as if explaining to someone with no financial background.",
      },
      meaningForMortgageHolders: {
        type: "string",
        description:
          "1-3 short sentences in Hebrew explaining what this news specifically means for people who already have a mortgage, or are about to take one. Practical and concrete, but must not promise a specific rate, approval, or financial outcome.",
      },
      closingQuestion: {
        type: "string",
        description:
          "A short, engaging Hebrew question to end the Instagram video with, inviting comments or DMs (e.g. 'איך זה משפיע על המשכנתא שלכם? ספרו לי בתגובות'). Must not promise an outcome.",
      },
    },
    required: ["whatHappened", "meaningForMortgageHolders", "closingQuestion"],
  },
};

export type GeneratedRtmBrief = {
  whatHappened: string;
  meaningForMortgageHolders: string;
  closingQuestion: string;
};

export async function generateRtmBrief(newsItem: {
  source: RtmSource;
  title: string;
  summary: string | null;
}): Promise<GeneratedRtmBrief> {
  const model = getContentModel();
  const message = await getClient().messages.create({
    model,
    max_tokens: 800,
    system: `${RTM_BUSINESS_CONTEXT}\n\n${COMPLIANCE_RULES}`,
    tools: [RTM_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: RTM_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `ידיעה מ-${RTM_SOURCE_LABEL[newsItem.source]}:
כותרת: ${newsItem.title}
${newsItem.summary ? `תקציר: ${newsItem.summary}` : ""}

הכן בריף קצר לסרטון אינסטגרם על בסיס הידיעה הזו, לפי הסכמה שסיפקתי.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured RTM brief.");
  }

  return toolUse.input as GeneratedRtmBrief;
}
