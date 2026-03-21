import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Settings2, Shield } from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileTab from "@/components/settings/ProfileTab";
import PreferencesTab from "@/components/settings/PreferencesTab";
import AccountTab from "@/components/settings/AccountTab";
import AppShell from "@/components/AppShell";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState("gclaw/default");
  const [ttsVoiceId, setTtsVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url);
        }
      });
    supabase.from("user_settings").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setDefaultModel(data.default_model);
          setNotificationsEnabled(data.notifications_enabled);
          if (data.tts_voice_id) setTtsVoiceId(data.tts_voice_id);
        }
      });
  }, [user]);

  return (
    <AppShell title="Settings" maxWidth="max-w-2xl">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="profile" className="gap-2 min-h-[44px]">
            <User className="h-4 w-4 hidden sm:block" />
            <span className="sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 min-h-[44px]">
            <Settings2 className="h-4 w-4 hidden sm:block" />
            <span className="sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2 min-h-[44px]">
            <Shield className="h-4 w-4 hidden sm:block" />
            <span className="sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab
            userId={user?.id || ""}
            email={user?.email}
            displayName={displayName}
            setDisplayName={setDisplayName}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            loading={loading}
            setLoading={setLoading}
          />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab
            userId={user?.id || ""}
            defaultModel={defaultModel}
            setDefaultModel={setDefaultModel}
            ttsVoiceId={ttsVoiceId}
            setTtsVoiceId={setTtsVoiceId}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            loading={loading}
            setLoading={setLoading}
          />
        </TabsContent>
        <TabsContent value="account">
          <AccountTab signOut={signOut} loading={loading} setLoading={setLoading} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Settings;
