import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { displayNameSchema } from "@/lib/validations";

interface ProfileTabProps {
  userId: string;
  email: string | undefined;
  displayName: string;
  setDisplayName: (v: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const ProfileTab = ({
  userId,
  email,
  displayName,
  setDisplayName,
  avatarUrl,
  setAvatarUrl,
  loading,
  setLoading,
}: ProfileTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || "?";

  const handleSaveProfile = async () => {
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
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

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
        .eq("user_id", userId);
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
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
        <p className="text-sm text-muted-foreground">{email}</p>
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
    </div>
  );
};

export default ProfileTab;
