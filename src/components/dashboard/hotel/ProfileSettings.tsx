import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Hotel, Lock, Upload } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  slug: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  about_us: string | null;
  about_us_image: string | null;
  logo_url: string | null;
  google_maps_url: string | null;
}

const ProfileSettings = () => {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [hotelName, setHotelName] = useState("");
  const [hotelSlug, setHotelSlug] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [hotelDescription, setHotelDescription] = useState("");
  const [hotelAboutUs, setHotelAboutUs] = useState("");
  const [aboutUsImageUrl, setAboutUsImageUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingAboutUsImage, setUploadingAboutUsImage] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHotelData();
  }, []);

  const fetchHotelData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: hotelData, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!error && hotelData) {
      setHotel(hotelData);
      setHotelName(hotelData.name || "");
      setHotelSlug(hotelData.slug || "");
      setHotelAddress(hotelData.address || "");
      setHotelPhone(hotelData.phone || "");
      setHotelEmail(hotelData.email || "");
      setHotelDescription(hotelData.description || "");
      setHotelAboutUs(hotelData.about_us || "");
      setAboutUsImageUrl(hotelData.about_us_image || "");
      setGoogleMapsUrl(hotelData.google_maps_url || "");
      setLogoUrl(hotelData.logo_url || "");
    }
  };


  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!user || !hotel) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `hotel-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleAboutUsImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAboutUsImage(true);
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
      if (!user || !hotel) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-about-${Date.now()}.${fileExt}`;
      const filePath = `hotel-about/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-assets')
        .getPublicUrl(filePath);

      setAboutUsImageUrl(publicUrl);
      toast.success("About Us image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingAboutUsImage(false);
    }
  };

  const handleSaveHotelInfo = async () => {
    if (!hotel) return;

    if (!hotelName.trim() || !hotelAddress.trim()) {
      toast.error("Hotel name and address are required");
      return;
    }

    if (hotelSlug && !/^[a-z0-9-]+$/.test(hotelSlug)) {
      toast.error("URL slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('hotels')
      .update({
        name: hotelName,
        slug: hotelSlug || null,
        address: hotelAddress,
        phone: hotelPhone || null,
        email: hotelEmail || null,
        description: hotelDescription || null,
        about_us: hotelAboutUs || null,
        about_us_image: aboutUsImageUrl || null,
        google_maps_url: googleMapsUrl || null,
        logo_url: logoUrl || null
      })
      .eq('id', hotel.id);

    setLoading(false);
    if (error) {
      if (error.code === '23505') {
        toast.error("This URL slug is already taken. Please choose another one.");
      } else {
        toast.error("Failed to update hotel information");
      }
    } else {
      toast.success("Hotel information updated successfully");
      fetchHotelData();
    }
  };


  const handleChangeLoginPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    
    // First verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("User email not found");
      setLoading(false);
      return;
    }

    // Try to sign in with current password to verify it
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      toast.error("Current password is incorrect");
      setLoading(false);
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to update password");
    } else {
      toast.success("Login password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-muted-foreground">Manage your hotel information and security settings</p>
      </div>

      {/* Hotel Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Hotel Information
          </CardTitle>
          <CardDescription>
            Update your hotel details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hotel-name">Hotel Name *</Label>
            <Input
              id="hotel-name"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="Enter hotel name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-slug">Public URL Slug</Label>
            <Input
              id="hotel-slug"
              value={hotelSlug}
              onChange={(e) => setHotelSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="my-hotel-name"
            />
            <p className="text-xs text-muted-foreground">
              Your hotel will be accessible at: {window.location.origin}/{hotelSlug || "your-slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-address">Address *</Label>
            <Textarea
              id="hotel-address"
              value={hotelAddress}
              onChange={(e) => setHotelAddress(e.target.value)}
              placeholder="Enter hotel address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hotel-phone">Phone</Label>
              <Input
                id="hotel-phone"
                value={hotelPhone}
                onChange={(e) => setHotelPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-email">Email</Label>
              <Input
                id="hotel-email"
                type="email"
                value={hotelEmail}
                onChange={(e) => setHotelEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-description">Description</Label>
            <Textarea
              id="hotel-description"
              value={hotelDescription}
              onChange={(e) => setHotelDescription(e.target.value)}
              placeholder="Brief description of your hotel"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-about-us">About Us</Label>
            <Textarea
              id="hotel-about-us"
              value={hotelAboutUs}
              onChange={(e) => setHotelAboutUs(e.target.value)}
              placeholder="Tell visitors about your hotel's story, values, and what makes it special"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-maps-url">Google My Business / Maps URL</Label>
            <Input
              id="google-maps-url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="Paste your Google My Business or Google Maps URL"
            />
            <p className="text-xs text-muted-foreground">
              Get this from your Google Business Profile or share link from Google Maps
            </p>
          </div>

          <div className="space-y-2">
            <Label>About Us Image</Label>
            <div className="flex items-center gap-4">
              {aboutUsImageUrl && (
                <img
                  src={aboutUsImageUrl}
                  alt="About us"
                  className="h-32 w-48 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1">
                <Input
                  id="about-us-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAboutUsImageUpload}
                  disabled={uploadingAboutUsImage}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('about-us-image-upload')?.click()}
                  disabled={uploadingAboutUsImage}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAboutUsImage ? "Uploading..." : aboutUsImageUrl ? "Change Image" : "Upload Image"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  This image will appear in the About Us section. Max size: 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hotel Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Hotel logo"
                  className="h-20 w-20 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: 5MB. Supported formats: JPG, PNG, WEBP
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveHotelInfo} disabled={loading}>
            {loading ? "Saving..." : "Save Hotel Information"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Login Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Login Password
          </CardTitle>
          <CardDescription>
            Update your account login password
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

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
            />
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

          <Button onClick={handleChangeLoginPassword} disabled={loading}>
            {loading ? "Updating..." : "Update Login Password"}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default ProfileSettings;
