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
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
};

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

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      toast.error("Access denied — admin role required");
      navigate("/chat");
      return;
    }
    loadAdminData();
  }, [isAdmin, roleLoading]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to load admin data");
      }

      const data = await resp.json();
      setProfiles(data.profiles || []);
      setConversations(data.conversations || []);
      setAuditLogs(data.auditLogs || []);
      setStats(data.stats || { totalUsers: 0, totalConversations: 0, totalMessages: 0 });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "assign_role", user_id: userId, role }),
      });

      if (!resp.ok) throw new Error("Failed to assign role");
      toast.success(`Role "${role}" assigned`);
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "revoke_role", user_id: userId, role }),
      });

      if (!resp.ok) throw new Error("Failed to revoke role");
      toast.success(`Role "${role}" revoked`);
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message);
    }
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

  const filteredProfiles = profiles.filter(
    (p) =>
      !userSearch ||
      (p.display_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      p.user_id.includes(userSearch)
  );

  const filteredConversations = conversations.filter(
    (c: any) =>
      !convSearch ||
      (c.title || "").toLowerCase().includes(convSearch.toLowerCase())
  );

  const chartData = [
    { name: "Users", value: stats.totalUsers },
    { name: "Conversations", value: stats.totalConversations },
    { name: "Messages", value: stats.totalMessages },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
          <h1 className="font-display text-lg font-bold">Admin Dashboard</h1>
          <Badge variant="outline" className="ml-2 text-xs">
            <ShieldCheck className="mr-1 h-3 w-3" /> Admin
          </Badge>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </div>

      <div className="container px-4 py-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4 hidden sm:block" />
              Users
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 hidden sm:block" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4 hidden sm:block" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 hidden sm:block" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.display_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select onValueChange={(role) => handleAssignRole(p.user_id, role)}>
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue placeholder="Assign role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeRole(p.user_id, "admin")}
                        className="text-xs"
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        Revoke Admin
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredProfiles.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {filteredConversations.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Model: {c.model} · {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {c.message_count || 0} messages
                    </Badge>
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No conversations found</p>
                )}
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
                      {log.target_type && (
                        <span className="text-xs text-muted-foreground">
                          on {log.target_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                      {log.actor_id && ` · Actor: ${log.actor_id.slice(0, 8)}...`}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No audit logs yet</p>
                )}
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
