import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import {
  Mic, PanelLeft, Sparkles, AlertTriangle, LogIn,
} from "lucide-react";
import SkillsPanel, { DEFAULT_SKILLS, type Skill } from "@/components/chat/SkillsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { useUserRole } from "@/hooks/useUserRole";
import { messageSchema } from "@/lib/validations";
import { getAccessToken } from "@/lib/supabase-helpers";
import {
  ALL_MODEL_GROUPS, MODEL_SKILL_COMPAT, SKILL_LABELS,
  getIncompatibleSkills, getFilteredModelGroups,
} from "@/lib/models";
import {
  loadLocalConversations, saveLocalConversations, loadLocalMessages,
  saveLocalMessages, deleteLocalConversation, clearLocalChatData,
} from "@/lib/chat-storage";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";

const VoiceAgent = lazy(() => import("@/components/chat/VoiceAgent"));
const KnowledgeBasePanel = lazy(() => import("@/components/chat/KnowledgeBasePanel"));

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; model: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_MESSAGE_LENGTH = 10000;

const Chat = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const isGuest = !user;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(isGuest ? "zephel/zephel-fast" : ALL_MODEL_GROUPS[0].models[0].value);
  const [allowedModels, setAllowedModels] = useState<string[] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingTtsIdx, setLoadingTtsIdx] = useState<number | null>(null);
  const [ttsVoiceId, setTtsVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [autoReadEnabled, setAutoReadEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoReadContentRef = useRef<string | null>(null);
  const [signupNudgeDismissed, setSignupNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("gclaw_signup_nudge_dismissed") === "1"; } catch { return false; }
  });
  const abortRef = useRef<AbortController | null>(null);

  const enabledSkillIds = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);

  const toggleSkill = (id: string) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  // ── Data fetching effects ──

  useEffect(() => {
    const fetchAllowedModels = async () => {
      try {
        const { data } = await supabase.from("model_access_defaults").select("model, enabled, visitor_enabled");
        if (!data) return;
        if (user) {
          const { data: overrides } = await supabase.from("user_model_overrides").select("model, enabled").eq("user_id", user.id);
          const overrideMap = new Map(overrides?.map((o: any) => [o.model, o.enabled]) || []);
          setAllowedModels(data.filter((m: any) => overrideMap.has(m.model) ? overrideMap.get(m.model) : m.enabled).map((m: any) => m.model));
        } else {
          setAllowedModels(data.filter((m: any) => m.visitor_enabled).map((m: any) => m.model));
        }
      } catch { setAllowedModels(null); }
    };
    fetchAllowedModels();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("default_model, tts_voice_id").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.default_model) setModel(data.default_model);
        if ((data as any)?.tts_voice_id) setTtsVoiceId((data as any).tts_voice_id);
      });
  }, [user]);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  // Auto-switch model if incompatible with active skills
  useEffect(() => {
    const active = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);
    if (active.length === 0) return;
    const incompatible = getIncompatibleSkills(model, active);
    if (incompatible.length > 0) {
      const allAllowed = ALL_MODEL_GROUPS.flatMap((g) => g.models).filter((m) => !allowedModels || allowedModels.includes(m.value));
      const first = allAllowed.find((m) => getIncompatibleSkills(m.value, active).length === 0);
      if (first) {
        setModel(first.value);
        toast.info(`Switched to ${first.label} — ${incompatible.map((s) => SKILL_LABELS[s] || s).join(", ")} not supported by previous model`);
      }
    }
  }, [skills, allowedModels]);

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
        if (localMsgs.length > 0) await supabase.from("messages").insert(localMsgs.map((m) => ({ conversation_id: newConv.id, role: m.role, content: m.content })));
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
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    if (user) {
      supabase.from("messages").select("*").eq("conversation_id", activeConv).order("created_at", { ascending: true })
        .then(({ data }) => { if (data) setMessages(data.map((m: any) => ({ role: m.role, content: m.content }))); });
    } else {
      setMessages(loadLocalMessages(activeConv));
    }
    const conv = conversations.find((c) => c.id === activeConv);
    if (conv) setModel(conv.model);
  }, [activeConv]);

  // ── CRUD ──

  const createConversation = async () => {
    if (user) {
      const { data, error } = await supabase.from("conversations").insert({ user_id: user.id, model }).select().single();
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

  const renameConversation = async (id: string) => {
    if (!editTitle.trim()) return;
    if (user) await supabase.from("conversations").update({ title: editTitle.trim() }).eq("id", id);
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c));
      if (!user) saveLocalConversations(updated);
      return updated;
    });
    setEditingConvId(null);
  };

  const selectConversation = (id: string) => {
    setActiveConv(id);
    if (isMobile) setSidebarOpen(false);
  };

  // ── TTS ──

  const stripMarkdown = (md: string) =>
    md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "").replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]*)\]\(.*?\)/g, "$1").replace(/#{1,6}\s?/g, "").replace(/[*_~]{1,3}/g, "")
      .replace(/>\s?/gm, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();

  const speakMessage = useCallback(async (content: string, idx: number) => {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingIdx(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingIdx(null);
    const text = stripMarkdown(content);
    if (!text) return;
    setLoadingTtsIdx(idx);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text, voiceId: ttsVoiceId }),
      });
      if (!response.ok) throw new Error("TTS request failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingIdx(idx);
      setLoadingTtsIdx(null);
      audio.onended = () => { setPlayingIdx(null); audioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingIdx(null); audioRef.current = null; URL.revokeObjectURL(url); toast.error("Audio playback failed"); };
      await audio.play();
    } catch {
      setLoadingTtsIdx(null);
      setPlayingIdx(null);
      toast.error("Failed to generate speech");
    }
  }, [playingIdx, ttsVoiceId]);

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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

  // ── Streaming ──

  const processStream = async (resp: Response, onContent: (content: string) => void): Promise<string> => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
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
        } catch { textBuffer = line + "\n" + textBuffer; break; }
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

  const handleAutoRead = () => {
    if (autoReadContentRef.current && autoReadEnabled) {
      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        if (prev[lastIdx]?.role === "assistant") speakMessage(prev[lastIdx].content, lastIdx);
        return prev;
      });
    }
    autoReadContentRef.current = null;
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
      const resp = await fetch(CHAT_URL, { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ messages: trimmedMessages, model, skills: enabledSkillIds }), signal: controller.signal });
      if (!resp.ok || !resp.body) throw new Error("Failed to regenerate");
      const result = await processStream(resp, updateStreamingMessage);
      if (result) {
        if (user) await supabase.from("messages").insert({ conversation_id: activeConv, role: "assistant", content: result, model });
        else saveLocalMessages(activeConv, [...trimmedMessages, { role: "assistant" as const, content: result }]);
        autoReadContentRef.current = result;
      }
    } catch (err: any) { if (err.name !== "AbortError") toast.error("Regeneration failed"); }
    finally { setIsStreaming(false); abortRef.current = null; handleAutoRead(); }
  };

  const send = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput || input).trim();
    if (!text || isStreaming) return;
    const validation = messageSchema.safeParse(text);
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }
    const userMsg: Msg = { role: "user", content: text };
    if (!overrideInput) setInput("");
    let convId = activeConv;
    if (!convId) { convId = await createConversation(); if (!convId) return; }
    if (user) await supabase.from("messages").insert({ conversation_id: convId, role: "user", content: userMsg.content });
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    if (!user) saveLocalMessages(convId, allMessages);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const resp = await fetch(CHAT_URL, { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ messages: allMessages, model, skills: enabledSkillIds }), signal: controller.signal });
      if (resp.status === 429) { toast.error("Rate limit exceeded. Please try again later."); setIsStreaming(false); return; }
      if (resp.status === 402) { toast.error("Credits required."); setIsStreaming(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");
      const result = await processStream(resp, updateStreamingMessage);
      if (result) {
        if (user) await supabase.from("messages").insert({ conversation_id: convId, role: "assistant", content: result, model });
        if (allMessages.length === 1) {
          const title = userMsg.content.slice(0, 60);
          if (user) await supabase.from("conversations").update({ title }).eq("id", convId);
          setConversations((prev) => { const updated = prev.map((c) => (c.id === convId ? { ...c, title } : c)); if (!user) saveLocalConversations(updated); return updated; });
        }
        if (!user) saveLocalMessages(convId, [...allMessages, { role: "assistant" as const, content: result }]);
        autoReadContentRef.current = result;
      }
    } catch (err: any) { if (err.name !== "AbortError") { toast.error("Failed to get response"); console.error(err); } }
    finally { setIsStreaming(false); abortRef.current = null; handleAutoRead(); }
  }, [input, isStreaming, activeConv, messages, model, user, enabledSkillIds]);

  // ── Render ──

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );

  const activeSkillCount = skills.filter((s) => s.enabled).length;
  const activeSkillsForCompat = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);
  const MODEL_GROUPS = getFilteredModelGroups(allowedModels, activeSkillsForCompat);

  return (
    <div className="flex h-[100dvh] bg-background">
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        isAdmin={isAdmin}
        conversations={conversations}
        activeConv={activeConv}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        editingConvId={editingConvId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onCreateConversation={createConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
        onStartRename={(id, title) => { setEditingConvId(id); setEditTitle(title); }}
        onFinishRename={renameConversation}
        onSignOut={signOut}
      />

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Open sidebar">
              <PanelLeft className="h-5 w-5" />
            </button>
          )}
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[140px] md:w-[200px] min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.models.map((m) => (
                    <SelectItem key={m.value} value={m.value} disabled={m.isDisabled} className={m.isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                      title={m.isDisabled ? `Not compatible with: ${m.incompatibleSkills.map((s) => SKILL_LABELS[s] || s).join(", ")}` : undefined}
                    >
                      <span className="flex items-center gap-1.5">
                        {m.label}
                        {m.isDisabled && (
                          <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {m.incompatibleSkills.map((s) => SKILL_LABELS[s] || s).join(", ")}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {isGuest && (
            <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px] hidden sm:flex" asChild>
              <Link to="/auth"><LogIn className="h-3.5 w-3.5" /> Sign In</Link>
            </Button>
          )}
          <ThemeToggle className="hidden sm:flex" />
          <Button variant={skillsPanelOpen ? "default" : "outline"} size="sm" className="gap-1.5 min-h-[44px]" onClick={() => setSkillsPanelOpen(!skillsPanelOpen)}>
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Skills</span>
            {activeSkillCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-foreground">{activeSkillCount}</span>
            )}
          </Button>
          {user && (
            <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]" onClick={() => setShowVoice(!showVoice)}>
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{showVoice ? "Hide" : "Voice"}</span>
            </Button>
          )}
        </div>

        {showVoice && user ? (
          <div className={isMobile ? "fixed inset-0 z-50 bg-background flex flex-col" : "flex flex-1 flex-col"}>
            {isMobile && (
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => setShowVoice(false)} className="min-h-[44px]">
                  <PanelLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <span className="font-mono font-semibold text-sm">Voice Agent</span>
              </div>
            )}
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
              <VoiceAgent userId={user.id} onConversationSaved={(conv) => setConversations((prev) => [conv, ...prev])} />
            </Suspense>
          </div>
        ) : (
          <>
            <ChatMessages
              messages={messages}
              isStreaming={isStreaming}
              isGuest={isGuest}
              skills={skills}
              onToggleSkill={toggleSkill}
              onSend={(prompt) => { setInput(prompt); setTimeout(() => send(prompt), 0); }}
              onCopy={copyMessage}
              onSpeak={speakMessage}
              onRegenerate={regenerateMessage}
              onDelete={deleteMessage}
              copiedIdx={copiedIdx}
              playingIdx={playingIdx}
              loadingTtsIdx={loadingTtsIdx}
              signupNudgeDismissed={signupNudgeDismissed}
              onDismissNudge={() => { setSignupNudgeDismissed(true); try { localStorage.setItem("gclaw_signup_nudge_dismissed", "1"); } catch {} }}
              conversationCount={conversations.length}
            />
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={() => send()}
              isStreaming={isStreaming}
              enabledSkillIds={enabledSkillIds}
              skills={skills}
              autoReadEnabled={autoReadEnabled}
              setAutoReadEnabled={setAutoReadEnabled}
            />
          </>
        )}
      </div>

      {/* Skills Panel */}
      {isMobile ? (
        <Drawer open={skillsPanelOpen} onOpenChange={setSkillsPanelOpen}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> OpenClaw Skills
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${skill.color}20` }}>
                        <skill.icon className="h-4 w-4" style={{ color: skill.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{skill.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                      </div>
                    </div>
                    <Button variant={skill.enabled ? "default" : "outline"} size="sm" onClick={() => toggleSkill(skill.id)} className="shrink-0 ml-2 min-h-[44px] min-w-[52px]">
                      {skill.enabled ? "On" : "Off"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {user && (
              <Suspense fallback={null}>
                <KnowledgeBasePanel enabled={skills.find(s => s.id === "knowledge_base")?.enabled || false} />
              </Suspense>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <SkillsPanel
          open={skillsPanelOpen}
          onClose={() => setSkillsPanelOpen(false)}
          skills={skills}
          onToggleSkill={toggleSkill}
          knowledgeBasePanel={user ? (
            <Suspense fallback={null}>
              <KnowledgeBasePanel enabled={skills.find(s => s.id === "knowledge_base")?.enabled || false} />
            </Suspense>
          ) : undefined}
        />
      )}
    </div>
  );
};

export default Chat;
