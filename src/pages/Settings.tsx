import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, User, Settings2, Shield } from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";
import ProfileTab from "@/components/settings/ProfileTab";
import PreferencesTab from "@/components/settings/PreferencesTab";
import AccountTab from "@/components/settings/AccountTab";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState("google/gemini-3-flash-preview");
  const [ttsVoiceId, setTtsVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url);
        }
      });

    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDefaultModel(data.default_model);
          setNotificationsEnabled(data.notifications_enabled);
          if (data.tts_voice_id) setTtsVoiceId(data.tts_voice_id);
        }
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={logoSrc} alt="gClaw" className="h-6 w-6" />
          <h1 className="font-display text-lg font-bold">Settings</h1>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="profile" className="gap-2 min-h-[44px]">
              <User className="h-4 w-4 hidden sm:block" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2 min-h-[44px]">
              <Settings2 className="h-4 w-4 hidden sm:block" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2 min-h-[44px]">
              <Shield className="h-4 w-4 hidden sm:block" />
              Account
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
      </div>
    </div>
  );
};

export default Settings;
