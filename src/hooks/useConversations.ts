import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  loadLocalConversations, saveLocalConversations, loadLocalMessages,
  saveLocalMessages, deleteLocalConversation, clearLocalChatData,
} from "@/lib/chat-storage";
import {
  extractLegacyImageAttachments,
  normalizeAttachments,
  type ChatAttachment,
} from "@/lib/chat-attachments";
import type { User } from "@supabase/supabase-js";

export type Conversation = { id: string; title: string; model: string; personality_id?: string | null; created_at: string };
export type Msg = { role: "user" | "assistant"; content: string; attachments?: ChatAttachment[] };

const hydrateMessage = (message: { role: "user" | "assistant"; content: string; attachments?: unknown }): Msg => {
  const attachments = normalizeAttachments(message.attachments);

  if (message.role === "user" && attachments.length === 0 && message.content.includes("![image](")) {
    const legacy = extractLegacyImageAttachments(message.content);
    return {
      role: message.role,
      content: legacy.content,
      attachments: legacy.attachments.length > 0 ? legacy.attachments : undefined,
    };
  }

  return {
    role: message.role,
    content: message.content,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
};

export function useConversations(user: User | null, defaultModel: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  // Load conversations
  useEffect(() => {
    if (user) {
      supabase.from("conversations").select("*").order("updated_at", { ascending: false })
        .then(({ data }) => { if (data) setConversations(data as Conversation[]); });
      const channel = supabase.channel("conversations-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
          supabase.from("conversations").select("*").order("updated_at", { ascending: false })
            .then(({ data }) => { if (data) setConversations(data as Conversation[]); });
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setConversations(loadLocalConversations());
    }
  }, [user]);

  // Migrate localStorage to DB
  useEffect(() => {
    if (!user) return;
    const localConvos = loadLocalConversations();
    if (localConvos.length === 0) return;
    const migrate = async () => {
      let migrated = 0;
      for (const conv of localConvos) {
        const localMsgs = loadLocalMessages(conv.id);
        const { data: newConv, error } = await supabase.from("conversations").insert({ user_id: user.id, title: conv.title, model: conv.model }).select().single();
        if (error || !newConv) continue;
        if (localMsgs.length > 0) {
          await supabase.from("messages").insert(
            localMsgs.map((m) => {
              const hydrated = hydrateMessage(m);
              return {
                conversation_id: newConv.id,
                role: hydrated.role,
                content: hydrated.content,
                attachments: hydrated.attachments ?? [],
              };
            }) as any
          );
        }
        migrated++;
      }
      clearLocalChatData();
      if (migrated > 0) {
        toast.success(`Migrated ${migrated} conversation${migrated > 1 ? "s" : ""} to your account`);
        const { data } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false });
        if (data) setConversations(data as Conversation[]);
      }
    };
    migrate();
  }, [user]);

  // Load messages on conversation switch
  const loadMessages = (convId: string | null) => {
    setActiveConv(convId);
    if (!convId) { setMessages([]); return; }
    if (user) {
      supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true })
        .then(({ data }) => { if (data) setMessages(data.map((m: any) => hydrateMessage(m))); });
    } else {
      setMessages(loadLocalMessages(convId).map((message) => hydrateMessage(message)));
    }
  };

  const createConversation = async (model: string, personalityId?: string | null): Promise<string | null> => {
    if (user) {
      const insertData: any = { user_id: user.id, model };
      if (personalityId) insertData.personality_id = personalityId;
      const { data, error } = await supabase.from("conversations").insert(insertData).select().single();
      if (error) { toast.error("Failed to create conversation"); return null; }
      const conv = data as Conversation;
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv.id);
      setMessages([]);
      return conv.id;
    } else {
      const conv: Conversation = { id: crypto.randomUUID(), title: "New Chat", model, created_at: new Date().toISOString() };
      const updated = [conv, ...conversations];
      setConversations(updated);
      saveLocalConversations(updated);
      setActiveConv(conv.id);
      setMessages([]);
      return conv.id;
    }
  };

  const deleteConversation = async (id: string) => {
    if (user) await supabase.from("conversations").delete().eq("id", id);
    else deleteLocalConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConv === id) { setActiveConv(null); setMessages([]); }
  };

  const renameConversation = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    if (user) await supabase.from("conversations").update({ title: newTitle.trim() }).eq("id", id);
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c));
      if (!user) saveLocalConversations(updated);
      return updated;
    });
  };

  const deleteMessage = async (idx: number) => {
    if (!activeConv) return;
    if (user) {
      const { data } = await supabase.from("messages").select("id").eq("conversation_id", activeConv).order("created_at", { ascending: true });
      if (data && data[idx]) await supabase.from("messages").delete().eq("id", data[idx].id);
    }
    const updated = messages.filter((_, i) => i !== idx);
    setMessages(updated);
    if (!user && activeConv) saveLocalMessages(activeConv, updated);
  };

  return {
    conversations, setConversations,
    activeConv, setActiveConv: loadMessages,
    messages, setMessages,
    createConversation, deleteConversation, renameConversation, deleteMessage,
  };
}
