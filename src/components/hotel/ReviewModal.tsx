import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string;
  hotelName: string;
}

export function ReviewModal({ open, onOpenChange, hotelId, hotelName }: ReviewModalProps) {
  const [step, setStep] = useState<"confirmation" | "review">("confirmation");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [validatingConfirmation, setValidatingConfirmation] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [reviewData, setReviewData] = useState({
    title: "",
    rating: 0,
    review: "",
    photoUrl: "",
  });

  const validateConfirmation = async () => {
    try {
      setValidatingConfirmation(true);

      // Validate confirmation number format
      if (!confirmationNumber || confirmationNumber.trim().length < 10) {
        toast.error("Please enter a valid confirmation number");
        return;
      }

      // Check if booking exists with this confirmation number
      const { data, error } = await supabase.rpc('verify_booking_for_review', {
        p_hotel_id: hotelId,
        p_confirmation_number: confirmationNumber.trim().toUpperCase(),
      });

      if (error) throw error;

      if (!data) {
        toast.error("No booking found with this confirmation number.");
        return;
      }

      setBookingId(data as string);
      setStep("review");
      toast.success("Confirmation verified! You can now write your review.");
    } catch (error: any) {
      console.error("Error validating confirmation:", error);
      toast.error("Failed to verify confirmation number. Please try again.");
    } finally {
      setValidatingConfirmation(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${hotelId}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("hotel-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("hotel-assets")
        .getPublicUrl(filePath);

      setReviewData({ ...reviewData, photoUrl: publicUrl });
      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);

      // Validate review data
      const reviewSchema = z.object({
        title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
        rating: z.number().min(1, "Please select a rating").max(5),
        review: z.string().trim().min(10, "Review must be at least 10 characters").max(1000),
      });

      const validated = reviewSchema.parse(reviewData);

      const { data, error } = await supabase.rpc('create_review_with_validation', {
        p_hotel_id: hotelId,
        p_confirmation_number: confirmationNumber.trim().toUpperCase(),
        p_title: validated.title,
        p_rating: validated.rating,
        p_review: validated.review,
        p_photo_url: reviewData.photoUrl || null,
      });

      if (error) {
        if (error.message === 'no_booking_for_confirmation') {
          throw new Error("No valid booking found with this confirmation number.");
        }
        throw error;
      }

      toast.success("Thank you! Your review has been submitted and is pending approval.");
      handleClose();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error submitting review:", error);
        toast.error("Failed to submit review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("confirmation");
    setConfirmationNumber("");
    setBookingId(null);
    setReviewData({ title: "", rating: 0, review: "", photoUrl: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Write a Review for {hotelName}</DialogTitle>
        </DialogHeader>

        {step === "confirmation" ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              To ensure authentic reviews, please enter your booking confirmation number.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation Number</Label>
              <Input
                id="confirmation"
                type="text"
                placeholder="WIXOXXXXXXXXX"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && validateConfirmation()}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                You can find this in your booking confirmation email
              </p>
            </div>
            <Button
              onClick={validateConfirmation}
              disabled={validatingConfirmation || !confirmationNumber}
              className="w-full"
            >
              {validatingConfirmation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Confirmation"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewData.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Review Title</Label>
              <Input
                id="title"
                placeholder="Summarize your experience"
                value={reviewData.title}
                onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <Label htmlFor="review">Your Review</Label>
              <Textarea
                id="review"
                placeholder="Share your experience with other travelers..."
                value={reviewData.review}
                onChange={(e) => setReviewData({ ...reviewData, review: e.target.value })}
                rows={6}
                maxLength={1000}
              />
              <p className="text-sm text-muted-foreground text-right">
                {reviewData.review.length}/1000
              </p>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Add a Photo (Optional)</Label>
              {reviewData.photoUrl ? (
                <div className="relative">
                  <img
                    src={reviewData.photoUrl}
                    alt="Review"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setReviewData({ ...reviewData, photoUrl: "" })}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {uploading ? "Uploading..." : "Click to upload a photo (Max 5MB)"}
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={submitting || !reviewData.rating || !reviewData.title || !reviewData.review}
                className="flex-1 bg-gradient-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
