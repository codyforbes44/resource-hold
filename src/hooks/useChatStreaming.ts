import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { messageSchema } from "@/lib/validations";
import { getAccessToken } from "@/lib/supabase-helpers";
import { saveLocalConversations, saveLocalMessages } from "@/lib/chat-storage";
import { describeVideoAttachments, extractLegacyImageAttachments, type ChatAttachment } from "@/lib/chat-attachments";
import type { User } from "@supabase/supabase-js";
import type { Msg, Conversation } from "./useConversations";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_RETRIES_PER_LINE = 3;

export function useChatStreaming(
  user: User | null,
  model: string,
  personalityId: string | null,
  enabledSkillIds: string[],
  messages: Msg[],
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>,
  activeConv: string | null,
  createConversation: (model: string, personalityId?: string | null) => Promise<string | null>,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  isStreaming: boolean,
  setIsStreaming: (v: boolean) => void,
  onStreamComplete?: (content: string) => void,
) {
  const abortRef = useRef<AbortController | null>(null);

  const toApiMessage = (message: Msg) => {
    const attachments = message.attachments ?? [];

    if (attachments.length === 0 && message.role === "user" && message.content.includes("![image](")) {
      const legacy = extractLegacyImageAttachments(message.content);
      const contentParts = [
        ...legacy.attachments.map((attachment) => ({ type: "image_url", image_url: { url: attachment.url } })),
        ...(legacy.content ? [{ type: "text", text: legacy.content }] : []),
      ];
      return contentParts.length > 0 ? { role: message.role, content: contentParts } : message;
    }

    if (attachments.length === 0) return message;

    const contentParts: Array<{ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string }> = [
      ...attachments
        .filter((attachment) => attachment.type === "image")
        .map((attachment) => ({ type: "image_url" as const, image_url: { url: attachment.url } })),
    ];

    const textSegments = [message.content.trim(), describeVideoAttachments(attachments)].filter(Boolean);
    if (textSegments.length > 0) {
      contentParts.push({ type: "text", text: textSegments.join("\n\n") });
    }

    return contentParts.length > 0 ? { role: message.role, content: contentParts } : message;
  };

  const processStream = async (resp: Response, onContent: (content: string) => void): Promise<string> => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    const retryCount = new Map<string, number>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) { assistantSoFar += content; onContent(assistantSoFar); }
          retryCount.delete(jsonStr);
        } catch {
          const count = (retryCount.get(line) || 0) + 1;
          if (count < MAX_RETRIES_PER_LINE) {
            retryCount.set(line, count);
            textBuffer = line + "\n" + textBuffer;
          }
          // else discard the unparseable line
          break;
        }
      }
    }
    return assistantSoFar;
  };

  const buildHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    headers.Authorization = user ? `Bearer ${await getAccessToken()}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
    return headers;
  };

  const updateStreamingMessage = (content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
      return [...prev, { role: "assistant", content }];
    });
  };

  const regenerateMessage = async (idx: number) => {
    if (isStreaming || !activeConv) return;
    const userMessages = messages.slice(0, idx).filter((m) => m.role === "user");
    if (userMessages.length === 0) return;
    const trimmedMessages = messages.slice(0, idx);
    setMessages(trimmedMessages);
    if (user) {
      const { data } = await supabase.from("messages").select("id").eq("conversation_id", activeConv).order("created_at", { ascending: true });
      if (data) for (const m of data.slice(idx)) await supabase.from("messages").delete().eq("id", m.id);
    }
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST", headers: await buildHeaders(),
        body: JSON.stringify({ messages: trimmedMessages, model, personality_id: personalityId, skills: enabledSkillIds }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error("Failed to regenerate");
      const result = await processStream(resp, updateStreamingMessage);
      if (result) {
        if (user) await supabase.from("messages").insert({ conversation_id: activeConv, role: "assistant", content: result, model });
        else saveLocalMessages(activeConv, [...trimmedMessages, { role: "assistant" as const, content: result }]);
        onStreamComplete?.(result);
      }
    } catch (err: any) { if (err.name !== "AbortError") toast.error("Regeneration failed"); }
    finally { setIsStreaming(false); abortRef.current = null; }
  };

  const send = useCallback(async (overrideInput?: string, inputState?: string, setInput?: (v: string) => void, attachments?: ChatAttachment[]) => {
    const text = (overrideInput || inputState || "").trim();
    if (!text && (!attachments || attachments.length === 0)) return;
    if (isStreaming) return;
    if (text) {
      const validation = messageSchema.safeParse(text);
      if (!validation.success) { toast.error(validation.error.errors[0].message); return; }
    }
    const userMsg: Msg = { role: "user", content: text, attachments: attachments?.length ? attachments : undefined };
    if (!overrideInput && setInput) setInput("");
    let convId = activeConv;
    if (!convId) { convId = await createConversation(model, personalityId); if (!convId) return; }
    if (user) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        role: "user",
        content: userMsg.content,
        attachments: userMsg.attachments ?? [],
      } as any);
    }
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    if (!user) saveLocalMessages(convId, allMessages);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiMessages = allMessages.map(toApiMessage);

      const resp = await fetch(CHAT_URL, {
        method: "POST", headers: await buildHeaders(),
        body: JSON.stringify({ messages: apiMessages, model, personality_id: personalityId, skills: enabledSkillIds }),
        signal: controller.signal,
      });
      if (resp.status === 429) { toast.error("Rate limit exceeded. Please try again later."); setIsStreaming(false); return; }
      if (resp.status === 402) { toast.error("Credits required."); setIsStreaming(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");
      const result = await processStream(resp, updateStreamingMessage);
      if (result) {
        if (user) await supabase.from("messages").insert({ conversation_id: convId, role: "assistant", content: result, model });
        if (allMessages.length === 1) {
          const title = (userMsg.content || userMsg.attachments?.[0]?.name || "New Chat").slice(0, 60);
          if (user) await supabase.from("conversations").update({ title }).eq("id", convId);
          setConversations((prev) => { const updated = prev.map((c) => (c.id === convId ? { ...c, title } : c)); if (!user) saveLocalConversations(updated); return updated; });
        }
        if (!user) saveLocalMessages(convId, [...allMessages, { role: "assistant" as const, content: result }]);
        onStreamComplete?.(result);
      }
    } catch (err: any) { if (err.name !== "AbortError") { toast.error("Failed to get response"); console.error(err); } }
    finally { setIsStreaming(false); abortRef.current = null; }
  }, [isStreaming, activeConv, messages, model, personalityId, user, enabledSkillIds]);

  return { send, regenerateMessage, abortRef };
}
