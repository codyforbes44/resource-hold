import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePasswordSchema, getPasswordStrength } from "@/lib/validations";

interface AccountTabProps {
  signOut: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const AccountTab = ({ signOut, loading, setLoading }: AccountTabProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(newPassword);

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

  return (
    <div className="space-y-6 pt-4">
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
    </div>
  );
};

export default AccountTab;
