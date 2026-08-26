import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chatbotTriggers,
  chatbotConversations,
  chatbotMessages,
  chatbotSettings,
} from "@/drizzle/schema";
import { COMPLIANCE_RULES } from "./anthropic";
import { getBriefModel } from "./rtm-brief";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export async function sendInstagramDM(
  recipientId: string,
  text: string
): Promise<string> {
  const igUserId = requireEnv("META_IG_USER_ID");
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  const res = await fetch(`${GRAPH_BASE}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to send DM (${res.status})`
    );
  }
  return json.message_id ?? json.id ?? "";
}

export async function replyToComment(
  commentId: string,
  text: string
): Promise<string> {
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  const res = await fetch(`${GRAPH_BASE}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: text, access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message || `Failed to reply to comment (${res.status})`
    );
  }
  return json.id ?? "";
}

export async function findMatchingTrigger(text: string) {
  const triggers = await db.query.chatbotTriggers.findMany({
    where: eq(chatbotTriggers.active, true),
  });

  const normalized = text.toLowerCase().trim();
  return triggers.find((t) => normalized.includes(t.keyword.toLowerCase()));
}

export async function getOrCreateConversation(
  igUserId: string,
  igUsername?: string
) {
  let conv = await db.query.chatbotConversations.findFirst({
    where: eq(chatbotConversations.igUserId, igUserId),
  });

  if (!conv) {
    const [created] = await db
      .insert(chatbotConversations)
      .values({
        igUserId,
        igUsername: igUsername ?? null,
      })
      .returning();
    conv = created;
  } else if (igUsername && conv.igUsername !== igUsername) {
    await db
      .update(chatbotConversations)
      .set({ igUsername })
      .where(eq(chatbotConversations.id, conv.id));
  }

  return conv;
}

export async function recordMessage(opts: {
  conversationId: string;
  direction: "inbound" | "outbound";
  source: "comment" | "dm" | "story_reply";
  text: string;
  triggerId?: string | null;
  aiGenerated?: boolean;
  igMessageId?: string | null;
}) {
  const [msg] = await db
    .insert(chatbotMessages)
    .values({
      conversationId: opts.conversationId,
      direction: opts.direction,
      source: opts.source,
      text: opts.text,
      triggerId: opts.triggerId ?? null,
      aiGenerated: opts.aiGenerated ?? false,
      igMessageId: opts.igMessageId ?? null,
    })
    .returning();

  await db
    .update(chatbotConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatbotConversations.id, opts.conversationId));

  return msg;
}

export async function incrementTriggerCount(triggerId: string) {
  const trigger = await db.query.chatbotTriggers.findFirst({
    where: eq(chatbotTriggers.id, triggerId),
  });
  if (trigger) {
    await db
      .update(chatbotTriggers)
      .set({ timesTriggered: trigger.timesTriggered + 1 })
      .where(eq(chatbotTriggers.id, triggerId));
  }
}

export async function getSettings() {
  let settings = await db.query.chatbotSettings.findFirst();
  if (!settings) {
    const [created] = await db
      .insert(chatbotSettings)
      .values({})
      .returning();
    settings = created;
  }
  return settings;
}

const SMART_REPLY_SYSTEM = `
אתה עוזר ליועץ משכנתאות ישראלי. אתה עונה בשם היועץ בהודעות אינסטגרם.

הסגנון שלך:
- עברית מדוברת, חמה ומקצועית.
- תשובות קצרות ותמציתיות - 1-3 משפטים מקסימום.
- לא מבטיח תוצאות, לא נותן מספרים ספציפיים.
- מזמין לפנות לייעוץ אישי.
- לא כותב "שלום!" או "היי!" בתחילת כל הודעה.

${COMPLIANCE_RULES}
`.trim();

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generateSmartReply(
  incomingMessage: string,
  conversationHistory: Array<{ direction: string; text: string }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const model = getBriefModel();
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.direction === "inbound" ? "לקוח" : "יועץ"}: ${m.text}`)
    .join("\n");

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: SMART_REPLY_SYSTEM }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `היסטוריית השיחה:\n${historyText}\n\nהודעה חדשה מהלקוח: "${incomingMessage}"\n\nכתוב תשובה קצרה בשם היועץ. החזר רק את הטקסט של התשובה, בלי הסברים.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "text/plain",
      temperature: 0.7,
      maxOutputTokens: 300,
    },
  });

  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      cache: "no-store",
    }
  );

  if (!res.ok) return "";

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() ?? "";
}

export async function handleIncomingMessage(opts: {
  senderId: string;
  senderUsername?: string;
  text: string;
  source: "comment" | "dm" | "story_reply";
  igMessageId?: string;
  commentId?: string;
}) {
  const settings = await getSettings();
  const conv = await getOrCreateConversation(
    opts.senderId,
    opts.senderUsername
  );

  await recordMessage({
    conversationId: conv.id,
    direction: "inbound",
    source: opts.source,
    text: opts.text,
    igMessageId: opts.igMessageId,
  });

  const trigger = await findMatchingTrigger(opts.text);

  if (trigger) {
    const shouldDM =
      trigger.action === "send_dm" || trigger.action === "both";
    const shouldReplyComment =
      (trigger.action === "reply_comment" || trigger.action === "both") &&
      opts.source === "comment" &&
      opts.commentId;

    if (shouldDM) {
      const msgId = await sendInstagramDM(opts.senderId, trigger.replyTemplate);
      await recordMessage({
        conversationId: conv.id,
        direction: "outbound",
        source: "dm",
        text: trigger.replyTemplate,
        triggerId: trigger.id,
        igMessageId: msgId,
      });
    }

    if (shouldReplyComment && opts.commentId) {
      await replyToComment(opts.commentId, trigger.replyTemplate);
      await recordMessage({
        conversationId: conv.id,
        direction: "outbound",
        source: "comment",
        text: trigger.replyTemplate,
        triggerId: trigger.id,
      });
    }

    await incrementTriggerCount(trigger.id);
    return;
  }

  if (opts.source === "story_reply" && settings.storyAutoReplyEnabled) {
    const msgId = await sendInstagramDM(
      opts.senderId,
      settings.storyAutoReplyTemplate
    );
    await recordMessage({
      conversationId: conv.id,
      direction: "outbound",
      source: "dm",
      text: settings.storyAutoReplyTemplate,
      igMessageId: msgId,
    });
    return;
  }

  if (
    opts.source === "dm" &&
    settings.aiSmartRepliesEnabled
  ) {
    const history = await db.query.chatbotMessages.findMany({
      where: eq(chatbotMessages.conversationId, conv.id),
      orderBy: [desc(chatbotMessages.sentAt)],
      limit: 10,
    });
    history.reverse();

    const reply = await generateSmartReply(
      opts.text,
      history.map((m) => ({ direction: m.direction, text: m.text }))
    );

    if (reply) {
      const msgId = await sendInstagramDM(opts.senderId, reply);
      await recordMessage({
        conversationId: conv.id,
        direction: "outbound",
        source: "dm",
        text: reply,
        aiGenerated: true,
        igMessageId: msgId,
      });
    }
  }
}
