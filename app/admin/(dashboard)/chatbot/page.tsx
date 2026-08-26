import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chatbotTriggers,
  chatbotConversations,
  chatbotMessages,
  chatbotSettings,
} from "@/drizzle/schema";
import TriggerForm from "./trigger-form";
import TriggerList from "./trigger-list";
import ConversationList from "./conversation-list";
import SettingsPanel from "./settings-panel";

export default async function ChatbotPage() {
  const triggers = await db.query.chatbotTriggers.findMany({
    orderBy: [desc(chatbotTriggers.createdAt)],
  });

  const conversations = await db.query.chatbotConversations.findMany({
    orderBy: [desc(chatbotConversations.lastMessageAt)],
    limit: 50,
  });

  const convIds = conversations.map((c) => c.id);
  const allMessages =
    convIds.length > 0
      ? await db.query.chatbotMessages.findMany({
          orderBy: [desc(chatbotMessages.sentAt)],
          limit: 200,
        })
      : [];

  const messagesByConv = new Map<string, typeof allMessages>();
  for (const msg of allMessages) {
    const arr = messagesByConv.get(msg.conversationId) ?? [];
    arr.push(msg);
    messagesByConv.set(msg.conversationId, arr);
  }

  let settings = await db.query.chatbotSettings.findFirst();
  if (!settings) {
    const [created] = await db.insert(chatbotSettings).values({}).returning();
    settings = created;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">צ&apos;אטבוט אינסטגרם</h1>
        <p className="mt-1 text-sm text-foreground/60">
          מענה אוטומטי לתגובות, הודעות וסטוריז - בסגנון ManyChat
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left column: Triggers */}
        <div className="flex flex-col gap-6">
          <TriggerForm />
          <TriggerList triggers={triggers} />
        </div>

        {/* Right column: Settings */}
        <div className="flex flex-col gap-6">
          <SettingsPanel settings={settings} />
        </div>
      </div>

      {/* Full width: Conversations */}
      <ConversationList
        conversations={conversations}
        messagesByConv={Object.fromEntries(messagesByConv)}
      />
    </div>
  );
}
