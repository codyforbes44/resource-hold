import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Send, Trash2, LogOut, Mic, Home } from "lucide-react";
import ReactMarkdown from "react-markdown";
import VoiceAgent from "@/components/chat/VoiceAgent";
import logoSrc from "@/assets/logo-gclaw.png";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; model: string; created_at: string };

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setConversations(data as Conversation[]);
      });
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConv)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
      });
    // Set model from conversation
    const conv = conversations.find((c) => c.id === activeConv);
    if (conv) setModel(conv.model);
  }, [activeConv]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversation = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user!.id, model })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create conversation");
      return null;
    }
    const conv = data as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv.id);
    setMessages([]);
    return conv.id;
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConv === id) {
      setActiveConv(null);
      setMessages([]);
    }
  };

  const send = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");

    let convId = activeConv;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: userMsg.content,
    });

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsStreaming(true);

    let assistantSoFar = "";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, model }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        setIsStreaming(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Credits required. Please add funds in Settings → Workspace → Usage.");
        setIsStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

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
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantSoFar) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantSoFar,
          model,
        });
        // Update conversation title on first message
        if (allMessages.length === 1) {
          const title = userMsg.content.slice(0, 60);
          await supabase.from("conversations").update({ title }).eq("id", convId);
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, title } : c))
          );
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Failed to get response");
        console.error(err);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, activeConv, messages, model, user]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
          <span className="font-display font-bold">gClaw Chat</span>
        </div>
        <div className="p-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={createConversation}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                activeConv === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onClick={() => setActiveConv(c.id)}
            >
              <span className="truncate">{c.title}</span>
              <button
                className="hidden text-muted-foreground hover:text-destructive group-hover:block"
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </ScrollArea>
        <div className="border-t border-border p-2 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => navigate("/")}>
            <Home className="h-4 w-4" /> Home
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowVoice(!showVoice)}>
            <Mic className="h-4 w-4" />
            {showVoice ? "Hide Voice" : "Voice Agent"}
          </Button>
        </div>

        {showVoice ? (
          <VoiceAgent userId={user!.id} onConversationSaved={(conv) => {
            setConversations((prev) => [conv, ...prev]);
          }} />
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <img src={logoSrc} alt="gClaw" className="h-16 w-16 opacity-30" />
                  <p className="text-lg text-muted-foreground">Start a conversation with gClaw</p>
                  <p className="max-w-md text-sm text-muted-foreground/60">
                    Choose a model above and type a message below. Your conversations are saved automatically.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button type="submit" disabled={isStreaming || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
