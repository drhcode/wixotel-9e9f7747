import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const ProfileSettings = () => {
  const [deletionPassword, setDeletionPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    checkExistingPassword();
  }, []);

  const checkExistingPassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('deletion_password')
      .eq('user_id', user.id)
      .single();

    setHasPassword(!!profile?.deletion_password);
  };

  const handleSave = async () => {
    if (!deletionPassword) {
      toast.error("Please enter a deletion password");
      return;
    }

    if (deletionPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (deletionPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ deletion_password: deletionPassword })
      .eq('user_id', user.id);

    setLoading(false);
    if (error) {
      toast.error("Failed to save password");
    } else {
      toast.success("Deletion password saved successfully");
      setDeletionPassword("");
      setConfirmPassword("");
      setHasPassword(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your account security settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Deletion Password
          </CardTitle>
          <CardDescription>
            {hasPassword 
              ? "Your deletion password is set. You can update it below."
              : "Set a password required for deleting reservations. This adds an extra layer of security."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deletion-password">
              {hasPassword ? "New Deletion Password" : "Deletion Password"}
            </Label>
            <Input
              id="deletion-password"
              type="password"
              value={deletionPassword}
              onChange={(e) => setDeletionPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : hasPassword ? "Update Password" : "Set Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
