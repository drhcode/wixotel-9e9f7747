import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Hotel, Lock, Upload, X, ImageIcon } from "lucide-react";
import { z } from "zod";
import { mapAuthError, mapDatabaseError } from "@/lib/errorUtils";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const hotelSchema = z.object({
  name: z.string().trim().min(2, "Hotel name must be at least 2 characters").max(200, "Name too long"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(500, "Address too long"),
  email: z.string().email("Invalid email").max(255, "Email too long").optional().or(z.literal('')),
  phone: z.string().regex(/^[+\d\s()-]{7,20}$/, "Invalid phone number").optional().or(z.literal('')),
  description: z.string().max(2000, "Description too long").optional(),
  about_us: z.string().max(5000, "About us too long").optional(),
  slug: z.string().trim().min(2, "Slug must be at least 2 characters").max(100, "Slug too long").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  seo_title: z.string().max(60, "SEO title should be under 60 characters").optional().or(z.literal('')),
  seo_description: z.string().max(160, "SEO description should be under 160 characters").optional().or(z.literal('')),
});

interface Hotel {
  id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  about_us: string | null;
  about_us_image: string | null;
  images: string[] | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_business_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  latitude: number | null;
  longitude: number | null;
}

const ProfileSettings = () => {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [hotelName, setHotelName] = useState("");
  const [hotelSlug, setHotelSlug] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelCity, setHotelCity] = useState("");
  const [hotelCountry, setHotelCountry] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [hotelDescription, setHotelDescription] = useState("");
  const [hotelAboutUs, setHotelAboutUs] = useState("");
  const [aboutUsImageUrl, setAboutUsImageUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingAboutUsImage, setUploadingAboutUsImage] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  
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
      setHotelCity(hotelData.city || "");
      setHotelCountry(hotelData.country || "");
      setFacebookUrl(hotelData.facebook_url || "");
      setInstagramUrl(hotelData.instagram_url || "");
      setGoogleBusinessUrl(hotelData.google_business_url || "");
      setSeoTitle(hotelData.seo_title || "");
      setSeoDescription(hotelData.seo_description || "");
      setLatitude(hotelData.latitude?.toString() || "");
      setLongitude(hotelData.longitude?.toString() || "");
      setGalleryImages(hotelData.images || []);
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

  const handleGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingGalleryImage(true);
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

      if (galleryImages.length >= 10) {
        toast.error("Maximum 10 gallery images allowed");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !hotel) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-gallery-${Date.now()}.${fileExt}`;
      const filePath = `hotel-gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-assets')
        .getPublicUrl(filePath);

      setGalleryImages(prev => [...prev, publicUrl]);
      toast.success("Gallery image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingGalleryImage(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    toast.success("Image removed from gallery");
  };

  const handleSaveHotelInfo = async () => {
    if (!hotel) return;

    // Validate form data
    const validation = hotelSchema.safeParse({
      name: hotelName,
      address: hotelAddress,
      email: hotelEmail,
      phone: hotelPhone,
      description: hotelDescription,
      about_us: hotelAboutUs,
      slug: hotelSlug || hotel.slug || '',
      seo_title: seoTitle,
      seo_description: seoDescription,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('hotels')
      .update({
        name: hotelName,
        slug: hotelSlug || null,
        address: hotelAddress,
        city: hotelCity || null,
        country: hotelCountry || null,
        phone: hotelPhone || null,
        email: hotelEmail || null,
        description: hotelDescription || null,
        about_us: hotelAboutUs || null,
        about_us_image: aboutUsImageUrl || null,
        images: galleryImages.length > 0 ? galleryImages : null,
        facebook_url: facebookUrl || null,
        instagram_url: instagramUrl || null,
        google_business_url: googleBusinessUrl || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      })
      .eq('id', hotel.id);

    setLoading(false);
    if (error) {
      toast.error(mapDatabaseError(error));
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
      toast.error(mapAuthError(signInError));
      setLoading(false);
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);
    if (error) {
      toast.error(mapAuthError(error));
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
            <AddressAutocomplete
              value={hotelAddress}
              onChange={(value) => setHotelAddress(value)}
              onSelectAddress={(data) => {
                setHotelAddress(data.address);
                setHotelCity(data.city);
                setHotelCountry(data.country);
              }}
              placeholder="Start typing your address..."
            />
            <p className="text-xs text-muted-foreground">
              Start typing to see suggestions with street names
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hotel-country">Country</Label>
              <Input
                id="hotel-country"
                value={hotelCountry}
                onChange={(e) => setHotelCountry(e.target.value)}
                placeholder="Enter country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-city">City</Label>
              <Input
                id="hotel-city"
                value={hotelCity}
                onChange={(e) => setHotelCity(e.target.value)}
                placeholder="Enter city"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="41.3275"
              />
              <p className="text-xs text-muted-foreground">
                Used for map location display
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="19.8187"
              />
              <p className="text-xs text-muted-foreground">
                Find coordinates on Google Maps
              </p>
            </div>
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
            <Label htmlFor="facebook-url">Facebook URL</Label>
            <Input
              id="facebook-url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/yourhotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram-url">Instagram URL</Label>
            <Input
              id="instagram-url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourhotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-business-url">Google My Business URL</Label>
            <Input
              id="google-business-url"
              value={googleBusinessUrl}
              onChange={(e) => setGoogleBusinessUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="text-xs text-muted-foreground">
              Get this from your Google Business Profile share link
            </p>
          </div>

          <Separator className="my-6" />
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">SEO Settings</h3>
              <p className="text-sm text-muted-foreground">
                Optimize how your hotel appears in search engines
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-title">SEO Title</Label>
              <Input
                id="seo-title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Best Hotel in City | Your Hotel Name"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                {seoTitle.length}/60 characters • This appears as the page title in search results
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-description">SEO Meta Description</Label>
              <Textarea
                id="seo-description"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Discover luxury accommodation at our hotel. Perfect location, modern amenities, and exceptional service for your stay."
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {seoDescription.length}/160 characters • This appears as the description snippet in search results
              </p>
            </div>
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

          <Separator className="my-6" />

          {/* Gallery Images Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Gallery Images
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload up to 10 images for your hotel gallery slider on the public page
              </p>
            </div>

            {/* Current Gallery Images */}
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {galleryImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-1.5 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div>
              <Input
                id="gallery-image-upload"
                type="file"
                accept="image/*"
                onChange={handleGalleryImageUpload}
                disabled={uploadingGalleryImage || galleryImages.length >= 10}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('gallery-image-upload')?.click()}
                disabled={uploadingGalleryImage || galleryImages.length >= 10}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingGalleryImage ? "Uploading..." : `Add Image (${galleryImages.length}/10)`}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Images will appear in the gallery slider on your public hotel page. Max size: 5MB per image
              </p>
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

          <Button onClick={handleChangeLoginPassword} disabled={loading}>
            {loading ? "Updating..." : "Update Login Password"}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default ProfileSettings;
