import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import {
  Plus,
  Send,
  Trash2,
  LogOut,
  Mic,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Copy,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Check,
  Pencil,
  AlertTriangle,
  LogIn,
  Volume2,
  Square,
  Loader2,
  VolumeX,
} from "lucide-react";
import SkillsPanel, { DEFAULT_SKILLS, type Skill } from "@/components/chat/SkillsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { useUserRole } from "@/hooks/useUserRole";
import { messageSchema } from "@/lib/validations";
import { getAccessToken } from "@/lib/supabase-helpers";
import logoSrc from "@/assets/logo-gclaw.png";

const VoiceAgent = lazy(() => import("@/components/chat/VoiceAgent"));
const MarkdownRenderer = lazy(() => import("@/components/chat/MarkdownRenderer"));
const KnowledgeBasePanel = lazy(() => import("@/components/chat/KnowledgeBasePanel"));

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; model: string; created_at: string };

// ── localStorage helpers for visitors ──
const LS_CONVOS_KEY = "gclaw_conversations";
const LS_MSGS_KEY = "gclaw_messages";

function loadLocalConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_CONVOS_KEY) || "[]");
  } catch { return []; }
}
function saveLocalConversations(convos: Conversation[]) {
  localStorage.setItem(LS_CONVOS_KEY, JSON.stringify(convos));
}
function loadLocalMessages(convId: string): Msg[] {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    return all[convId] || [];
  } catch { return []; }
}
function saveLocalMessages(convId: string, msgs: Msg[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    all[convId] = msgs;
    localStorage.setItem(LS_MSGS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
function deleteLocalConversation(convId: string) {
  try {
    const convos = loadLocalConversations().filter((c) => c.id !== convId);
    saveLocalConversations(convos);
    const all = JSON.parse(localStorage.getItem(LS_MSGS_KEY) || "{}");
    delete all[convId];
    localStorage.setItem(LS_MSGS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
function clearLocalChatData() {
  try {
    localStorage.removeItem(LS_CONVOS_KEY);
    localStorage.removeItem(LS_MSGS_KEY);
    localStorage.removeItem("gclaw_signup_nudge_dismissed");
  } catch { /* ignore */ }
}

const ALL_MODEL_GROUPS = [
  {
    label: "Google",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
      { value: "openai/gpt-5.2", label: "GPT-5.2" },
    ],
  },
  {
    label: "Zephel",
    models: [
      { value: "zephel/zephel", label: "Zephel" },
      { value: "zephel/zephel-pro", label: "Zephel Pro" },
      { value: "zephel/zephel-fast", label: "Zephel Fast" },
    ],
  },
  {
    label: "Anthropic",
    models: [
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
      { value: "anthropic/claude-haiku-3.5", label: "Claude Haiku 3.5" },
    ],
  },
];

const MODEL_SKILL_COMPAT: Record<string, string[]> = {
  "google/gemini-3-flash-preview": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-flash": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-pro": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "google/gemini-2.5-flash-lite": ["web_search", "code_interpreter"],
  "google/gemini-3.1-pro-preview": ["web_search", "code_interpreter", "image_generation", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5-mini": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "openai/gpt-5-nano": ["web_search", "code_interpreter"],
  "openai/gpt-5.2": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel-pro": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "zephel/zephel-fast": ["web_search", "code_interpreter"],
  "anthropic/claude-sonnet-4": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "anthropic/claude-opus-4": ["web_search", "code_interpreter", "knowledge_base", "deep_research", "memory", "browser"],
  "anthropic/claude-haiku-3.5": ["web_search", "code_interpreter"],
};

const SKILL_LABELS: Record<string, string> = {
  web_search: "Web Search",
  code_interpreter: "Code Interpreter",
  image_generation: "Image Generation",
  knowledge_base: "Knowledge Base",
  deep_research: "Deep Research",
  memory: "Memory",
  browser: "Browser Control",
};

const SUGGESTED_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a Python function to sort a list",
  "What are the latest trends in AI?",
  "Help me brainstorm a startup idea",
  "Summarize the key points of machine learning",
];

const MAX_MESSAGE_LENGTH = 10000;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(true);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enabledSkillIds = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // Fetch allowed models based on access control
  useEffect(() => {
    const fetchAllowedModels = async () => {
      try {
        const { data } = await supabase
          .from("model_access_defaults")
          .select("model, enabled, visitor_enabled");

        if (!data) return;

        if (user) {
          const { data: overrides } = await supabase
            .from("user_model_overrides")
            .select("model, enabled")
            .eq("user_id", user.id);

          const overrideMap = new Map(overrides?.map((o: any) => [o.model, o.enabled]) || []);
          const allowed = data
            .filter((m: any) => {
              if (overrideMap.has(m.model)) return overrideMap.get(m.model);
              return m.enabled;
            })
            .map((m: any) => m.model);
          setAllowedModels(allowed);
        } else {
          const allowed = data
            .filter((m: any) => m.visitor_enabled)
            .map((m: any) => m.model);
          setAllowedModels(allowed);
        }
      } catch {
        setAllowedModels(null);
      }
    };
    fetchAllowedModels();
  }, [user]);

  // Load user settings (default model) — only for authenticated users
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("default_model, tts_voice_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.default_model) setModel(data.default_model);
        if ((data as any)?.tts_voice_id) setTtsVoiceId((data as any).tts_voice_id);
      });
  }, [user]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Auto-switch model if current selection becomes incompatible with enabled skills
  useEffect(() => {
    const activeSkillsForSwitch = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);
    if (activeSkillsForSwitch.length === 0) return;
    const supported = MODEL_SKILL_COMPAT[model] || [];
    const incompatible = activeSkillsForSwitch.filter((skillId) => !supported.includes(skillId));
    if (incompatible.length > 0) {
      const allAllowed = ALL_MODEL_GROUPS.flatMap((g) => g.models)
        .filter((m) => !allowedModels || allowedModels.includes(m.value));
      const firstCompatible = allAllowed.find((m) => {
        const mSupported = MODEL_SKILL_COMPAT[m.value] || [];
        return activeSkillsForSwitch.every((s) => mSupported.includes(s));
      });
      if (firstCompatible) {
        setModel(firstCompatible.value);
        toast.info(`Switched to ${firstCompatible.label} — ${incompatible.map((s) => SKILL_LABELS[s] || s).join(", ")} not supported by previous model`);
      }
    }
  }, [skills, allowedModels]);

  // Load conversations — DB for auth'd, localStorage for guests
  useEffect(() => {
    if (user) {
      supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .then(({ data }) => {
          if (data) setConversations(data as Conversation[]);
        });

      const channel = supabase
        .channel("conversations-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          () => {
            supabase
              .from("conversations")
              .select("*")
              .order("updated_at", { ascending: false })
              .then(({ data }) => {
                if (data) setConversations(data as Conversation[]);
              });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setConversations(loadLocalConversations());
    }
  }, [user]);

  // Migrate localStorage conversations to DB when guest signs in
  useEffect(() => {
    if (!user) return;
    const localConvos = loadLocalConversations();
    if (localConvos.length === 0) return;

    const migrate = async () => {
      let migrated = 0;
      for (const conv of localConvos) {
        const localMsgs = loadLocalMessages(conv.id);
        // Create conversation in DB
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: conv.title,
            model: conv.model,
          })
          .select()
          .single();

        if (convErr || !newConv) continue;

        // Insert messages
        if (localMsgs.length > 0) {
          const rows = localMsgs.map((m) => ({
            conversation_id: newConv.id,
            role: m.role,
            content: m.content,
          }));
          await supabase.from("messages").insert(rows);
        }
        migrated++;
      }

      // Clear localStorage data
      clearLocalChatData();

      if (migrated > 0) {
        toast.success(`Migrated ${migrated} conversation${migrated > 1 ? "s" : ""} to your account`);
        // Refresh conversations from DB
        const { data } = await supabase
          .from("conversations")
          .select("*")
          .order("updated_at", { ascending: false });
        if (data) setConversations(data as Conversation[]);
      }
    };

    migrate();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    if (user) {
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
        });
    } else {
      setMessages(loadLocalMessages(activeConv));
    }
    const conv = conversations.find((c) => c.id === activeConv);
    if (conv) setModel(conv.model);
  }, [activeConv]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversation = async () => {
    if (user) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, model })
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
    } else {
      // Guest: localStorage
      const conv: Conversation = {
        id: crypto.randomUUID(),
        title: "New Chat",
        model,
        created_at: new Date().toISOString(),
      };
      const updated = [conv, ...conversations];
      setConversations(updated);
      saveLocalConversations(updated);
      setActiveConv(conv.id);
      setMessages([]);
      return conv.id;
    }
  };

  const deleteConversation = async (id: string) => {
    if (user) {
      await supabase.from("conversations").delete().eq("id", id);
    } else {
      deleteLocalConversation(id);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConv === id) {
      setActiveConv(null);
      setMessages([]);
    }
  };

  const renameConversation = async (id: string) => {
    if (!editTitle.trim()) return;
    if (user) {
      await supabase.from("conversations").update({ title: editTitle.trim() }).eq("id", id);
    }
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

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const stripMarkdown = (md: string) =>
    md
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
      .replace(/#{1,6}\s?/g, "")
      .replace(/[*_~]{1,3}/g, "")
      .replace(/>\s?/gm, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

  const speakMessage = useCallback(async (content: string, idx: number) => {
    // Toggle off if already playing this message
    if (playingIdx === idx) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingIdx(null);
      return;
    }

    // Stop any current playback
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingIdx(null);

    const text = stripMarkdown(content);
    if (!text) return;

    setLoadingTtsIdx(idx);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: ttsVoiceId }),
        }
      );

      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingIdx(idx);
      setLoadingTtsIdx(null);

      audio.onended = () => {
        setPlayingIdx(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingIdx(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
        toast.error("Audio playback failed");
      };

      await audio.play();
    } catch (e) {
      setLoadingTtsIdx(null);
      setPlayingIdx(null);
      toast.error("Failed to generate speech");
      console.error("TTS error:", e);
    }
  }, [playingIdx, ttsVoiceId]);

  const deleteMessage = async (idx: number) => {
    if (!activeConv) return;
    if (user) {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", activeConv)
        .order("created_at", { ascending: true });
      if (data && data[idx]) {
        await supabase.from("messages").delete().eq("id", data[idx].id);
      }
    }
    const updated = messages.filter((_, i) => i !== idx);
    setMessages(updated);
    if (!user && activeConv) saveLocalMessages(activeConv, updated);
  };

  const processStream = async (
    resp: Response,
    convId: string,
    onContent: (content: string) => void
  ): Promise<string> => {
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
          if (content) {
            assistantSoFar += content;
            onContent(assistantSoFar);
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    return assistantSoFar;
  };

  const regenerateMessage = async (idx: number) => {
    if (isStreaming || !activeConv) return;
    const userMessages = messages.slice(0, idx).filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const trimmedMessages = messages.slice(0, idx);
    setMessages(trimmedMessages);

    if (user) {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", activeConv)
        .order("created_at", { ascending: true });
      if (data) {
        const toDelete = data.slice(idx);
        for (const m of toDelete) {
          await supabase.from("messages").delete().eq("id", m.id);
        }
      }
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        headers.Authorization = `Bearer ${await getAccessToken()}`;
      } else {
        headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: trimmedMessages, model, skills: enabledSkillIds }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to regenerate");

      const assistantSoFar = await processStream(resp, activeConv, (content) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: "assistant", content }];
        });
      });

      if (assistantSoFar) {
        if (user) {
          await supabase.from("messages").insert({
            conversation_id: activeConv,
            role: "assistant",
            content: assistantSoFar,
            model,
          });
        } else {
          const allMsgs = [...trimmedMessages, { role: "assistant" as const, content: assistantSoFar }];
          saveLocalMessages(activeConv, allMsgs);
        }
        autoReadContentRef.current = assistantSoFar;
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast.error("Regeneration failed");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      if (autoReadContentRef.current && autoReadEnabled) {
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          if (prev[lastIdx]?.role === "assistant") {
            speakMessage(prev[lastIdx].content, lastIdx);
          }
          return prev;
        });
      }
      autoReadContentRef.current = null;
    }
  };

  const send = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput || input).trim();
      if (!text || isStreaming) return;

      const validation = messageSchema.safeParse(text);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const userMsg: Msg = { role: "user", content: text };
      if (!overrideInput) setInput("");

      let convId = activeConv;
      if (!convId) {
        convId = await createConversation();
        if (!convId) return;
      }

      if (user) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "user",
          content: userMsg.content,
        });
      }

      const allMessages = [...messages, userMsg];
      setMessages(allMessages);

      // Save to localStorage for guests immediately
      if (!user) saveLocalMessages(convId, allMessages);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user) {
          headers.Authorization = `Bearer ${await getAccessToken()}`;
        } else {
          headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
        }

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: allMessages,
            model,
            skills: enabledSkillIds,
          }),
          signal: controller.signal,
        });

        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          setIsStreaming(false);
          return;
        }
        if (resp.status === 402) {
          toast.error("Credits required.");
          setIsStreaming(false);
          return;
        }
        if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

        const assistantSoFar = await processStream(resp, convId, (content) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
            }
            return [...prev, { role: "assistant", content }];
          });
        });

        if (assistantSoFar) {
          if (user) {
            await supabase.from("messages").insert({
              conversation_id: convId,
              role: "assistant",
              content: assistantSoFar,
              model,
            });
          }

          // Update conversation title on first message
          if (allMessages.length === 1) {
            const title = userMsg.content.slice(0, 60);
            if (user) {
              await supabase.from("conversations").update({ title }).eq("id", convId);
            }
            setConversations((prev) => {
              const updated = prev.map((c) => (c.id === convId ? { ...c, title } : c));
              if (!user) saveLocalConversations(updated);
              return updated;
            });
          }

          // Save final messages to localStorage for guests
          if (!user) {
            const finalMsgs = [...allMessages, { role: "assistant" as const, content: assistantSoFar }];
            saveLocalMessages(convId, finalMsgs);
          }

          autoReadContentRef.current = assistantSoFar;
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Failed to get response");
          console.error(err);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Auto-read the response if enabled
        if (autoReadContentRef.current && autoReadEnabled) {
          // Find the last assistant message index
          setMessages((prev) => {
            const lastAssistantIdx = prev.length - 1;
            if (prev[lastAssistantIdx]?.role === "assistant") {
              speakMessage(prev[lastAssistantIdx].content, lastAssistantIdx);
            }
            return prev;
          });
        }
        autoReadContentRef.current = null;
      }
    },
    [input, isStreaming, activeConv, messages, model, user, enabledSkillIds]
  );

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

  const getIncompatibleSkills = (modelValue: string): string[] => {
    const supported = MODEL_SKILL_COMPAT[modelValue] || [];
    return activeSkillsForCompat.filter((skillId) => !supported.includes(skillId));
  };

  const filteredConversations = conversations.filter(
    (c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const charsRemaining = MAX_MESSAGE_LENGTH - input.length;

  const MODEL_GROUPS = ALL_MODEL_GROUPS
    .map((group) => ({
      ...group,
      models: group.models
        .filter((m) => !allowedModels || allowedModels.includes(m.value))
        .map((m) => ({
          ...m,
          incompatibleSkills: getIncompatibleSkills(m.value),
          isDisabled: getIncompatibleSkills(m.value).length > 0,
        })),
    }))
    .filter((group) => group.models.length > 0);

  const showCharCount = input.length > MAX_MESSAGE_LENGTH * 0.8;

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:relative md:z-auto md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full md:hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
            <span className="font-mono font-bold tracking-tight">
              gClaw <span className="text-muted-foreground font-normal">Chat</span>
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2 space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 min-h-[44px]" onClick={createConversation}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors min-h-[44px] ${
                activeConv === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onClick={() => selectConversation(c.id)}
            >
              {editingConvId === c.id ? (
                <form
                  className="flex-1 flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    renameConversation(c.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-6 text-xs"
                    autoFocus
                    onBlur={() => renameConversation(c.id)}
                  />
                </form>
              ) : (
                <span className="truncate flex-1">{c.title}</span>
              )}
              <div className="hidden items-center gap-1 group-hover:flex">
                <button
                  className="text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingConvId(c.id);
                    setEditTitle(c.title);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive min-h-[32px] min-w-[32px] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </ScrollArea>

        <div className="border-t border-border p-2 space-y-1">
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 min-h-[44px]" onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 min-h-[44px]" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive min-h-[44px]"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" className="w-full justify-start gap-2 min-h-[44px] glow-brand" asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4" /> Sign in to save chats
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open sidebar"
            >
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
                    <SelectItem
                      key={m.value}
                      value={m.value}
                      disabled={m.isDisabled}
                      className={m.isDisabled ? "opacity-40 cursor-not-allowed" : ""}
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

          {/* Guest sign-in nudge in top bar */}
          {isGuest && (
            <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px] hidden sm:flex" asChild>
              <Link to="/auth">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </Link>
            </Button>
          )}

          <ThemeToggle className="hidden sm:flex" />
          <Button
            variant={skillsPanelOpen ? "default" : "outline"}
            size="sm"
            className="gap-1.5 min-h-[44px]"
            onClick={() => setSkillsPanelOpen(!skillsPanelOpen)}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Skills</span>
            {activeSkillCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-foreground">
                {activeSkillCount}
              </span>
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
            <VoiceAgent
              userId={user.id}
              onConversationSaved={(conv) => {
                setConversations((prev) => [conv, ...prev]);
              }}
            />
            </Suspense>
          </div>
        ) : (
          <>
            {/* Guest sign-up nudge after 3+ conversations */}
            {isGuest && !signupNudgeDismissed && conversations.length >= 3 && (
              <div className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">You've started {conversations.length} chats!</span>{" "}
                  <Link to="/auth" className="text-primary hover:underline font-medium">Sign up</Link> to keep them forever and unlock all features.
                </p>
                <button
                  onClick={() => {
                    setSignupNudgeDismissed(true);
                    try { localStorage.setItem("gclaw_signup_nudge_dismissed", "1"); } catch {}
                  }}
                  className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors text-xs"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
            {/* Messages */}
            <ScrollArea className="flex-1 p-3 md:p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
                  <img src={logoSrc} alt="gClaw" className="h-16 w-16 opacity-30" />
                  <p className="text-lg text-muted-foreground">Start a conversation with gClaw</p>
                  <p className="max-w-md text-sm text-muted-foreground/60">
                    Choose a model above and type a message below. Enable skills via the{" "}
                    <Sparkles className="inline h-3.5 w-3.5" /> button.
                  </p>
                  {isGuest && (
                    <p className="text-xs text-muted-foreground/50">
                      <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to save conversations across sessions.
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInput(prompt);
                          setTimeout(() => send(prompt), 0);
                        }}
                        className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all min-h-[44px]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {skills.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleSkill(s.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all min-h-[44px] ${
                          s.enabled
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/20"
                        }`}
                      >
                        <s.icon className="h-3 w-3" />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`group mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="relative max-w-[90%] md:max-w-[80%]">
                    <div
                      className={`rounded-xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <Suspense fallback={<span>{msg.content}</span>}>
                          <MarkdownRenderer content={msg.content} />
                        </Suspense>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {/* Message actions */}
                    <div className="absolute -bottom-6 right-0 hidden items-center gap-1 group-hover:flex">
                      <button
                        onClick={() => copyMessage(msg.content, i)}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
                        title="Copy"
                      >
                        {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      {msg.role === "assistant" && (
                        <>
                          <button
                            onClick={() => speakMessage(msg.content, i)}
                            disabled={loadingTtsIdx === i}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                            title={playingIdx === i ? "Stop" : "Read aloud"}
                          >
                            {loadingTtsIdx === i ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : playingIdx === i ? (
                              <Square className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => regenerateMessage(i)}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
                            title="Regenerate"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteMessage(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="mb-4 flex justify-start">
                  <div className="flex items-center gap-1 rounded-xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </ScrollArea>

            {/* Active skills indicator */}
            {enabledSkillIds.length > 0 && (
              <div className="flex items-center gap-2 border-t border-border/50 px-4 py-1.5 bg-primary/5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-muted-foreground">
                  Active:{" "}
                  {skills
                    .filter((s) => s.enabled)
                    .map((s) => s.name)
                    .join(", ")}
                </span>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3 md:p-4 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    placeholder={
                      enabledSkillIds.length > 0
                        ? "Ask anything — skills active..."
                        : "Type a message..."
                    }
                    disabled={isStreaming}
                    className="flex-1 min-h-[44px] pr-14"
                    maxLength={MAX_MESSAGE_LENGTH}
                  />
                  {showCharCount && (
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${
                        charsRemaining < 500 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {charsRemaining.toLocaleString()}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant={autoReadEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={() => setAutoReadEnabled((v) => !v)}
                  className="min-h-[44px] min-w-[44px] shrink-0"
                  title={autoReadEnabled ? "Auto-read on — click to disable" : "Auto-read off — click to enable"}
                >
                  {autoReadEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button type="submit" disabled={isStreaming || !input.trim()} className="min-h-[44px] min-w-[44px]">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Skills Panel — Desktop: side panel, Mobile: bottom drawer */}
      {isMobile ? (
        <Drawer open={skillsPanelOpen} onOpenChange={setSkillsPanelOpen}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                OpenClaw Skills
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${skill.color}20` }}
                      >
                        <skill.icon className="h-4 w-4" style={{ color: skill.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{skill.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                      </div>
                    </div>
                    <Button
                      variant={skill.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSkill(skill.id)}
                      className="shrink-0 ml-2 min-h-[44px] min-w-[52px]"
                    >
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
        <>
          <SkillsPanel
            open={skillsPanelOpen}
            onClose={() => setSkillsPanelOpen(false)}
            skills={skills}
            onToggleSkill={toggleSkill}
            knowledgeBasePanel={
              user ? (
                <Suspense fallback={null}>
                  <KnowledgeBasePanel enabled={skills.find(s => s.id === "knowledge_base")?.enabled || false} />
                </Suspense>
              ) : undefined
            }
          />
        </>
      )}
    </div>
  );
};

export default Chat;
