import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Star } from "lucide-react";
import type { PublicReview } from "./types";

interface HotelReviewsSectionProps {
  reviews: PublicReview[];
  onWriteReview: () => void;
}

export const HotelReviewsSection = ({ reviews, onWriteReview }: HotelReviewsSectionProps) => {
  return (
    <section id="reviews" className="py-16 px-4 bg-gradient-to-b from-accent/30 to-background scroll-mt-16">
      <div className="container mx-auto">
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <h2 className="text-4xl font-bold tracking-tight">Guest Reviews</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our guests have to say about their experience
          </p>
          <Button onClick={onWriteReview} className="bg-gradient-primary hover:opacity-90 shadow-elegant">
            <MessageSquare className="h-4 w-4 mr-2" />
            Write a Review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <Card className="border-border/50 max-w-2xl mx-auto">
            <CardContent className="py-12 text-center text-muted-foreground">
              No reviews yet. Be the first to share your experience!
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review, index) => (
              <Card
                key={review.id}
                className="group overflow-hidden hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <CardTitle className="text-lg">{review.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                    {review.review_text}
                  </p>
                  {review.photo_url && (
                    <img
                      src={review.photo_url}
                      alt="Review"
                      className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">Verified Guest</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
