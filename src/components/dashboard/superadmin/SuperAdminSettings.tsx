import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Lock, User, Upload } from "lucide-react";
import { mapAuthError } from "@/lib/errorUtils";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

export function SuperAdminSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");
      setAvatarUrl(profileData.avatar_url || "");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-assets')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        avatar_url: avatarUrl || null
      })
      .eq('user_id', profile.user_id);

    setLoading(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      fetchProfileData();
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      toast.error("Password must contain at least one symbol (!@#$%^&* etc.)");
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("User email not found");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      toast.error(mapAuthError(signInError));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);
    if (error) {
      toast.error(mapAuthError(error));
    } else {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Super Admin Settings</h2>
        <p className="text-muted-foreground">Manage your profile and security settings</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar</Label>
            <div className="flex items-center gap-4">
              {avatarUrl && (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 200x200px. Max 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name *</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Change your login password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a secure password"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase letter and symbol (!@#$%^&* etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handleChangePassword} disabled={loading} variant="destructive">
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
