import type { ChatAttachment } from "@/lib/chat-attachments";

type Msg = { role: "user" | "assistant"; content: string; attachments?: ChatAttachment[] };
type Conversation = { id: string; title: string; model: string; created_at: string };

const LS_CONVOS_KEY = "gclaw_conversations";
const LS_MSGS_KEY = "gclaw_messages";

export function loadLocalConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_CONVOS_KEY) || "[]");
  } catch { return []; }
}

export function saveLocalConversations(convos: Conversation[]) {
  localStorage.setItem(LS_CONVOS_KEY, JSON.stringify(convos));
}

export function loadLocalMessages(convId: string): Msg[] {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    return all[convId] || [];
  } catch { return []; }
}

export function saveLocalMessages(convId: string, msgs: Msg[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    all[convId] = msgs;
    localStorage.setItem(LS_MSGS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function deleteLocalConversation(convId: string) {
  try {
    const convos = loadLocalConversations().filter((c) => c.id !== convId);
    saveLocalConversations(convos);
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    delete all[convId];
    localStorage.setItem(LS_MSGS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function clearLocalChatData() {
  try {
    localStorage.removeItem(LS_CONVOS_KEY);
    localStorage.removeItem(LS_MSGS_KEY);
    localStorage.removeItem("gclaw_signup_nudge_dismissed");
  } catch { /* ignore */ }
}
