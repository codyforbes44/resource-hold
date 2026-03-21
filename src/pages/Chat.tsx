import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Mic, PanelLeft, Sparkles, LogIn } from "lucide-react";
import SkillsPanel, { DEFAULT_SKILLS, type Skill } from "@/components/chat/SkillsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { useUserRole } from "@/hooks/useUserRole";
import { GCLAW_MODELS, DEFAULT_MODEL, GUEST_DEFAULT_MODEL } from "@/lib/models";
import { useConversations } from "@/hooks/useConversations";
import { useChatStreaming } from "@/hooks/useChatStreaming";
import { useTTS } from "@/hooks/useTTS";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import PersonalitySelector from "@/components/chat/PersonalitySelector";

const VoiceAgent = lazy(() => import("@/components/chat/VoiceAgent"));
const KnowledgeBasePanel = lazy(() => import("@/components/chat/KnowledgeBasePanel"));

const Chat = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const isGuest = !user;

  const [input, setInput] = useState("");
  const [model, setModel] = useState(isGuest ? GUEST_DEFAULT_MODEL : DEFAULT_MODEL);
  const [personalityId, setPersonalityId] = useState<string | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [autoReadEnabled, setAutoReadEnabled] = useState(false);
  const autoReadContentRef = useRef<string | null>(null);
  const [signupNudgeDismissed, setSignupNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("gclaw_signup_nudge_dismissed") === "1"; } catch { return false; }
  });

  const enabledSkillIds = skills.filter((s) => s.enabled && s.id !== "code_interpreter").map((s) => s.id);
  const toggleSkill = (id: string) => setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const {
    conversations, setConversations,
    activeConv, setActiveConv,
    messages, setMessages,
    createConversation, deleteConversation, renameConversation, deleteMessage,
  } = useConversations(user, model);

  const { playingIdx, loadingTtsIdx, copiedIdx, speakMessage, copyMessage } = useTTS(ttsVoiceId);

  const handleAutoRead = (content: string) => {
    if (autoReadEnabled) {
      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        if (prev[lastIdx]?.role === "assistant") speakMessage(prev[lastIdx].content, lastIdx);
        return prev;
      });
    }
  };

  const { send, regenerateMessage } = useChatStreaming(
    user, model, personalityId, enabledSkillIds,
    messages, setMessages, activeConv,
    createConversation, setConversations,
    isStreaming, setIsStreaming, handleAutoRead,
  );

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

  // Load model from active conversation
  useEffect(() => {
    if (!activeConv) return;
    const conv = conversations.find((c) => c.id === activeConv);
    if (conv) {
      setModel(conv.model);
      if (conv.personality_id) setPersonalityId(conv.personality_id);
    }
  }, [activeConv, conversations]);

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
  const filteredModels = allowedModels ? GCLAW_MODELS.filter((m) => allowedModels.includes(m.value)) : GCLAW_MODELS;

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
        onCreateConversation={() => createConversation(model, personalityId)}
        onSelectConversation={(id) => { setActiveConv(id); if (isMobile) setSidebarOpen(false); }}
        onDeleteConversation={deleteConversation}
        onStartRename={(id, title) => { setEditingConvId(id); setEditTitle(title); }}
        onFinishRename={(id) => { renameConversation(id, editTitle); setEditingConvId(null); }}
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
              {filteredModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-[10px] text-muted-foreground hidden md:inline">{m.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PersonalitySelector selectedId={personalityId} onSelect={setPersonalityId} />
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
              onSend={(prompt) => { setInput(prompt); setTimeout(() => send(prompt, input, setInput), 0); }}
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
              onSend={() => send(undefined, input, setInput)}
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
