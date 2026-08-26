import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/chatbot";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WebhookEntry = {
  id: string;
  time: number;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      is_echo?: boolean;
    };
  }>;
  changes?: Array<{
    field: string;
    value: {
      id: string;
      text?: string;
      from?: { id: string; username?: string };
      media?: { id: string };
      parent_id?: string;
    };
  }>;
};

type WebhookBody = {
  object: string;
  entry: WebhookEntry[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as WebhookBody;

  if (body.object !== "instagram") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const igUserId = process.env.META_IG_USER_ID;

  for (const entry of body.entry) {
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (!event.message?.text || event.message.is_echo) continue;
        if (event.sender.id === igUserId) continue;

        try {
          await handleIncomingMessage({
            senderId: event.sender.id,
            text: event.message.text,
            source: "dm",
            igMessageId: event.message.mid,
          });
        } catch (err) {
          console.error("Chatbot DM error:", err);
        }
      }
    }

    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "comments" && change.value.text && change.value.from) {
          if (change.value.from.id === igUserId) continue;

          try {
            await handleIncomingMessage({
              senderId: change.value.from.id,
              senderUsername: change.value.from.username,
              text: change.value.text,
              source: "comment",
              commentId: change.value.id,
            });
          } catch (err) {
            console.error("Chatbot comment error:", err);
          }
        }

        if (
          change.field === "story_insights" ||
          (change.field === "mentions" && change.value.text && change.value.from)
        ) {
          if (change.value.from && change.value.from.id !== igUserId) {
            try {
              await handleIncomingMessage({
                senderId: change.value.from.id,
                senderUsername: change.value.from.username,
                text: change.value.text || "",
                source: "story_reply",
              });
            } catch (err) {
              console.error("Chatbot story reply error:", err);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
