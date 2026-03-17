import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { ArrowLeft, Upload, User, Settings2, Shield } from "lucide-react";
import { changePasswordSchema, displayNameSchema, getPasswordStrength } from "@/lib/validations";
import logoSrc from "@/assets/logo-gclaw.png";

const MODEL_GROUPS = [
  {
    label: "Google",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5", label: "GPT-5" },
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
];

const TTS_VOICES = [
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George (Default)" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura" },
  { value: "IKne3meq5aSn9XLyUdCD", label: "Charlie" },
  { value: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger" },
  { value: "N2lVS1w4EtoT3dr4eOWO", label: "Callum" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam" },
  { value: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily" },
  { value: "cgSgspJ2msm6clMCkdW9", label: "Jessica" },
  { value: "cjVigY5qzO86Huf0OWal", label: "Eric" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian" },
];

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState("google/gemini-3-flash-preview");
  const [ttsVoiceId, setTtsVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(newPassword);

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
          if ((data as any).tts_voice_id) setTtsVoiceId((data as any).tts_voice_id);
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const nameResult = displayNameSchema.safeParse(displayName);
    if (!nameResult.success) {
      toast.error(nameResult.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    setLoading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      setAvatarUrl(publicUrl);
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          default_model: defaultModel,
          notifications_enabled: notificationsEnabled,
          tts_voice_id: ttsVoiceId,
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Preferences saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = changePasswordSchema.safeParse({ newPassword, confirmNewPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setPasswordErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    toast.error("Account deletion requires admin assistance. Please contact support.");
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

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

          <TabsContent value="profile" className="space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 min-h-[44px] min-w-[44px]"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {displayName.length}/100
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={loading} className="w-full sm:w-auto">
                Save Profile
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Default AI Model</Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TTS Voice</Label>
                <p className="text-xs text-muted-foreground">Voice used for reading AI responses aloud</p>
                <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Toggle between light and dark mode</p>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]">
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Enable desktop notifications</p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Button onClick={handleSavePreferences} disabled={loading} className="w-full sm:w-auto">
                Save Preferences
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-6 pt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-sm font-semibold">Change Password</h3>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={passwordErrors.newPassword ? "border-destructive" : ""}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
                )}
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Strength: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={passwordErrors.confirmNewPassword ? "border-destructive" : ""}
                />
                {passwordErrors.confirmNewPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>
              <Button type="submit" disabled={loading || !newPassword}>
                Update Password
              </Button>
            </form>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-sm font-semibold">Sign Out</h3>
              <Button variant="outline" onClick={signOut} className="w-full sm:w-auto">
                Sign Out
              </Button>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
              <Button variant="destructive" onClick={handleDeleteAccount} className="w-full sm:w-auto">
                Delete Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
