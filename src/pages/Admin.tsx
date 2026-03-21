import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AppShell from "@/components/AppShell";
import KnowledgeBaseTab from "@/components/admin/KnowledgeBaseTab";
import TaskadeTab from "@/components/admin/TaskadeTab";
import PersonalitiesTab from "@/components/admin/PersonalitiesTab";
import { toast } from "sonner";
import {
  Users, MessageSquare, ClipboardList, BarChart3, Search,
  Shield, ShieldCheck, Cpu, Globe, UserCog, Eye, BookOpen, Sparkles,
  ExternalLink, Activity, CheckSquare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Profile = { id: string; user_id: string; display_name: string | null; avatar_url: string | null; created_at: string };
type AuditLog = { id: string; actor_id: string | null; action: string; target_type: string | null; target_id: string | null; metadata: any; created_at: string };
type ModelDefault = { model: string; enabled: boolean; visitor_enabled: boolean };
type UserModelOverride = { user_id: string; model: string; enabled: boolean };

const PROVIDER_CONFIG: Record<string, { color: string; label: string }> = {
  google: { color: "hsl(var(--primary))", label: "Google" },
  openai: { color: "hsl(142 71% 45%)", label: "OpenAI" },
};

function getProvider(model: string) {
  const prefix = model.split("/")[0];
  return PROVIDER_CONFIG[prefix] || { color: "hsl(var(--muted-foreground))", label: prefix };
}

function getModelLabel(model: string) {
  const name = model.split("/")[1] || model;
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, totalConversations: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [modelDefaults, setModelDefaults] = useState<ModelDefault[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserModelOverride[]>([]);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [togglingModel, setTogglingModel] = useState<string | null>(null);
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [kbStats, setKbStats] = useState({ totalDocs: 0, totalChunks: 0, pendingDocs: 0, errorDocs: 0 });
  const [personalities, setPersonalities] = useState<any[]>([]);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) { toast.error("Access denied — admin role required"); navigate("/chat"); return; }
    loadAdminData();
  }, [isAdmin, roleLoading]);

  const callAdmin = async (method: string, body?: any) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const resp = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || "Request failed"); }
    return resp.json();
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const data = await callAdmin("GET");
      setProfiles(data.profiles || []);
      setConversations(data.conversations || []);
      setAuditLogs(data.auditLogs || []);
      setStats(data.stats || { totalUsers: 0, totalConversations: 0, totalMessages: 0 });
      setModelDefaults(data.modelDefaults || []);
      setUserOverrides(data.userModelOverrides || []);
      setKbDocs(data.kbDocuments || []);
      setKbStats(data.kbStats || { totalDocs: 0, totalChunks: 0, pendingDocs: 0, errorDocs: 0 });
      setPersonalities(data.personalities || []);
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try { await callAdmin("POST", { action: "assign_role", user_id: userId, role }); toast.success(`Role "${role}" assigned`); loadAdminData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    try { await callAdmin("POST", { action: "revoke_role", user_id: userId, role }); toast.success(`Role "${role}" revoked`); loadAdminData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleModelDefault = async (model: string, field: "enabled" | "visitor_enabled", value: boolean) => {
    setTogglingModel(model);
    try {
      await callAdmin("POST", { action: "set_model_default", model, [field]: value });
      setModelDefaults((prev) => prev.map((m) => (m.model === model ? { ...m, [field]: value } : m)));
      toast.success(`${getModelLabel(model)} ${field === "enabled" ? "user access" : "visitor access"} ${value ? "enabled" : "disabled"}`);
    } catch (err: any) { toast.error(err.message); } finally { setTogglingModel(null); }
  };

  const handleSetUserOverride = async (userId: string, model: string, enabled: boolean | null) => {
    try {
      await callAdmin("POST", { action: "set_user_model_override", user_id: userId, model, enabled });
      if (enabled === null) {
        setUserOverrides((prev) => prev.filter((o) => !(o.user_id === userId && o.model === model)));
        toast.success("Override removed");
      } else {
        setUserOverrides((prev) => {
          const existing = prev.find((o) => o.user_id === userId && o.model === model);
          if (existing) return prev.map((o) => (o.user_id === userId && o.model === model ? { ...o, enabled } : o));
          return [...prev, { user_id: userId, model, enabled }];
        });
        toast.success(`Override ${enabled ? "granted" : "revoked"} for model`);
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleKbAction = async (action: string, payload?: any) => {
    await callAdmin("POST", { action, ...payload });
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const filteredProfiles = profiles.filter((p) => !userSearch || (p.display_name || "").toLowerCase().includes(userSearch.toLowerCase()) || p.user_id.includes(userSearch));
  const filteredConversations = conversations.filter((c: any) => !convSearch || (c.title || "").toLowerCase().includes(convSearch.toLowerCase()));
  const chartData = [
    { name: "Users", value: stats.totalUsers },
    { name: "Conversations", value: stats.totalConversations },
    { name: "Messages", value: stats.totalMessages },
  ];
  const modelsByProvider = modelDefaults.reduce<Record<string, ModelDefault[]>>((acc, m) => {
    const provider = m.model.split("/")[0];
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(m);
    return acc;
  }, {});
  const selectedUserOverrides = overrideUserId
    ? modelDefaults.map((md) => {
        const override = userOverrides.find((o) => o.user_id === overrideUserId && o.model === md.model);
        return { ...md, override: override?.enabled ?? null };
      })
    : [];
  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.display_name || p.user_id.slice(0, 8)]));

  return (
    <AppShell title="Admin Dashboard" badge={<Badge variant="outline" className="text-xs ml-2"><ShieldCheck className="mr-1 h-3 w-3" /> Admin</Badge>}>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full flex overflow-x-auto gap-1 mb-6">
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <Users className="h-4 w-4 hidden sm:block" /> Users
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <Cpu className="h-4 w-4 hidden sm:block" /> Models
          </TabsTrigger>
          <TabsTrigger value="kb" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <BookOpen className="h-4 w-4 hidden sm:block" /> Knowledge
          </TabsTrigger>
          <TabsTrigger value="personalities" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <Sparkles className="h-4 w-4 hidden sm:block" /> Personas
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <MessageSquare className="h-4 w-4 hidden sm:block" /> Chats
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <ClipboardList className="h-4 w-4 hidden sm:block" /> Audit
          </TabsTrigger>
          <TabsTrigger value="taskade" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <CheckSquare className="h-4 w-4 hidden sm:block" /> Taskade
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs sm:text-sm min-h-[44px] flex-shrink-0">
            <BarChart3 className="h-4 w-4 hidden sm:block" /> System
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm min-h-[44px]" />
          </div>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-2">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.display_name || "No name"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.user_id}</p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select onValueChange={(role) => handleAssignRole(p.user_id, role)}>
                      <SelectTrigger className="w-[130px] min-h-[44px]"><SelectValue placeholder="Assign role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleRevokeRole(p.user_id, "admin")} className="text-xs min-h-[44px]">
                      <Shield className="mr-1 h-3 w-3" /> Revoke Admin
                    </Button>
                  </div>
                </div>
              ))}
              {filteredProfiles.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No users found</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Globe className="h-4 w-4" /> Global Model Access</h3>
            <p className="text-xs text-muted-foreground mb-4">Control which models are available to registered users and anonymous visitors.</p>
            <div className="space-y-4">
              {Object.entries(modelsByProvider).map(([provider, models]) => {
                const config = getProvider(provider + "/");
                return (
                  <div key={provider}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{config.label}</span>
                    </div>
                    <div className="grid gap-2">
                      {models.map((md) => (
                        <div key={md.model} className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{getModelLabel(md.model)}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{md.model}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col items-center gap-1">
                              <Switch checked={md.enabled} disabled={togglingModel === md.model} onCheckedChange={(v) => handleToggleModelDefault(md.model, "enabled", v)} />
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> Users</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Switch checked={md.visitor_enabled} disabled={togglingModel === md.model} onCheckedChange={(v) => handleToggleModelDefault(md.model, "visitor_enabled", v)} />
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> Visitors</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserCog className="h-4 w-4" /> Per-User Model Overrides</h3>
            <p className="text-xs text-muted-foreground mb-4">Grant or revoke model access for specific users, overriding global defaults.</p>
            <div className="flex items-center gap-2 mb-4">
              <Select value={overrideUserId} onValueChange={setOverrideUserId}>
                <SelectTrigger className="w-full max-w-sm min-h-[44px]"><SelectValue placeholder="Select a user..." /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (<SelectItem key={p.user_id} value={p.user_id}>{p.display_name || p.user_id.slice(0, 8)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {overrideUserId && (
              <div className="grid gap-2">
                {selectedUserOverrides.map((item) => (
                  <div key={item.model} className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{getModelLabel(item.model)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">Global: {item.enabled ? "✓" : "✗"}</span>
                        {item.override !== null && <Badge variant="outline" className="text-[10px] h-4">Override: {item.override ? "Granted" : "Revoked"}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant={item.override === true ? "default" : "outline"} size="sm" className="text-xs h-8 px-2 min-h-[36px]" onClick={() => handleSetUserOverride(overrideUserId, item.model, true)}>Grant</Button>
                      <Button variant={item.override === false ? "destructive" : "outline"} size="sm" className="text-xs h-8 px-2 min-h-[36px]" onClick={() => handleSetUserOverride(overrideUserId, item.model, false)}>Revoke</Button>
                      {item.override !== null && <Button variant="ghost" size="sm" className="text-xs h-8 px-2 min-h-[36px]" onClick={() => handleSetUserOverride(overrideUserId, item.model, null)}>Reset</Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="kb">
          <KnowledgeBaseTab
            documents={kbDocs}
            kbStats={kbStats}
            profileMap={profileMap}
            onAction={handleKbAction}
            onRefresh={loadAdminData}
          />
        </TabsContent>

        {/* Personalities Tab */}
        <TabsContent value="personalities">
          <PersonalitiesTab
            personalities={personalities}
            onAction={handleKbAction}
            onRefresh={loadAdminData}
          />
        </TabsContent>

        {/* Taskade Tab */}
        <TabsContent value="taskade">
          <TaskadeTab />
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." value={convSearch} onChange={(e) => setConvSearch(e.target.value)} className="max-w-sm min-h-[44px]" />
          </div>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-2">
              {filteredConversations.map((c: any) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Model: {c.model} · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs w-fit">{c.message_count || 0} messages</Badge>
                </div>
              ))}
              {filteredConversations.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No conversations found</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    {log.target_type && <span className="text-xs text-muted-foreground">on {log.target_type}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                    {log.actor_id && ` · Actor: ${log.actor_id.slice(0, 8)}...`}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                  )}
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No audit logs yet</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Users</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalConversations}</p>
              <p className="text-sm text-muted-foreground mt-1">Conversations</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalMessages}</p>
              <p className="text-sm text-muted-foreground mt-1">Messages</p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-4">Platform Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> LLM Observability
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              All chat LLM calls, tool executions, and errors are traced via LangSmith for monitoring and debugging.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Project</p>
                <p className="text-sm font-mono font-medium">gclaw-chat</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Traced Events</p>
                <p className="text-sm font-medium">LLM calls · Tool runs · Errors</p>
              </div>
            </div>
            <a
              href="https://smith.langchain.com/o/default/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open LangSmith Dashboard
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Admin;
