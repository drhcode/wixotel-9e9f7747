import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Trash2, Check, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Review {
  id: string;
  hotel_id: string;
  guest_email: string;
  title: string;
  rating: number;
  review_text: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  hotels: {
    name: string;
  };
}

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          hotels(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reviewId: string, newStatus: string) => {
    try {
      setUpdatingId(reviewId);
      const { error } = await supabase
        .from("reviews")
        .update({ status: newStatus })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success(`Review ${newStatus === "approved" ? "approved" : "rejected"} successfully`);
      fetchReviews();
    } catch (error: any) {
      console.error("Error updating review status:", error);
      toast.error("Failed to update review status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setDeletingId(reviewToDelete);
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewToDelete);

      if (error) throw error;

      toast.success("Review deleted successfully");
      fetchReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    }
  };

  const openDeleteDialog = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setDeleteDialogOpen(true);
  };

  const openImageDialog = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reviews Management</h2>
        <p className="text-muted-foreground">Manage and moderate hotel reviews</p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reviews yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{review.title}</CardTitle>
                      <Badge
                        variant={
                          review.status === "approved"
                            ? "default"
                            : review.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {review.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {review.hotels.name} • {review.guest_email} •{" "}
                      {new Date(review.created_at).toLocaleDateString()}
                    </CardDescription>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{review.review_text}</p>

                {review.photo_url && (
                  <button
                    onClick={() => openImageDialog(review.photo_url!)}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={review.photo_url}
                      alt="Review"
                      className="w-full max-w-md h-48 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                      <ImageIcon className="h-8 w-8 text-white" />
                    </div>
                  </button>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {review.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(review.id, "approved")}
                        disabled={updatingId === review.id}
                        className="bg-gradient-primary"
                      >
                        {updatingId === review.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(review.id, "rejected")}
                        disabled={updatingId === review.id}
                      >
                        {updatingId === review.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  {review.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(review.id, "rejected")}
                      disabled={updatingId === review.id}
                    >
                      {updatingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </>
                      )}
                    </Button>
                  )}
                  {review.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(review.id, "approved")}
                      disabled={updatingId === review.id}
                    >
                      {updatingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteDialog(review.id)}
                    disabled={deletingId === review.id}
                    className="ml-auto"
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img src={selectedImage} alt="Review" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
