"use client";

import { useState } from "react";
import { updateConversationStatusAction } from "./actions";

type Message = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  source: "comment" | "dm" | "story_reply";
  text: string;
  aiGenerated: boolean;
  sentAt: Date;
};

type Conversation = {
  id: string;
  igUserId: string;
  igUsername: string | null;
  status: "active" | "resolved" | "escalated";
  lastMessageAt: Date;
};

const STATUS_LABELS: Record<string, string> = {
  active: "פעיל",
  resolved: "טופל",
  escalated: "הועבר",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  resolved: "bg-gray-100 text-gray-600",
  escalated: "bg-amber-100 text-amber-700",
};

export default function ConversationList({
  conversations,
  messagesByConv,
}: {
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-black/5 bg-surface p-6 text-center text-sm text-foreground/50">
        אין שיחות עדיין. כשמישהו ישלח הודעה או תגובה באינסטגרם, השיחות יופיעו כאן.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-primary">
        שיחות אחרונות ({conversations.length})
      </h3>

      <div className="flex flex-col gap-2">
        {conversations.map((conv) => {
          const messages = (messagesByConv[conv.id] ?? []).sort(
            (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
          const lastMsg = messages[messages.length - 1];
          const isExpanded = expandedId === conv.id;

          return (
            <div
              key={conv.id}
              className="rounded-2xl border border-black/5 bg-surface shadow-sm"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                className="flex w-full items-center justify-between p-4 text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(conv.igUsername ?? conv.igUserId)[0]?.toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-primary">
                      {conv.igUsername ?? conv.igUserId}
                    </span>
                    {lastMsg && (
                      <span className="max-w-[300px] truncate text-xs text-foreground/50">
                        {lastMsg.direction === "outbound" ? "אתה: " : ""}
                        {lastMsg.text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground/40">
                    {messages.length} הודעות
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_COLORS[conv.status]
                    }`}
                  >
                    {STATUS_LABELS[conv.status]}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-black/5 p-4">
                  <div className="mb-3 flex gap-2">
                    {(["active", "resolved", "escalated"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          updateConversationStatusAction(conv.id, s)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          conv.status === s
                            ? "bg-primary text-white"
                            : "bg-black/5 text-foreground/60 hover:bg-black/10"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.direction === "outbound"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            msg.direction === "outbound"
                              ? "bg-primary/10 text-primary"
                              : "bg-black/5 text-foreground/80"
                          }`}
                          dir="rtl"
                        >
                          <p>{msg.text}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground/40">
                            <span>
                              {new Date(msg.sentAt).toLocaleTimeString("he-IL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.aiGenerated && <span>AI</span>}
                            {msg.source !== "dm" && <span>{msg.source}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
