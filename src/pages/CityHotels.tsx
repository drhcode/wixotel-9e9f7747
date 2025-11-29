import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import HotelsLeafletMap from "@/components/HotelsLeafletMap";
import { Skeleton } from "@/components/ui/skeleton";

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string | null;
  country: string | null;
  description: string | null;
  images: string[] | null;
  about_us_image: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_featured: boolean;
  avgRating?: number;
  reviewCount?: number;
}

const CityHotels = () => {
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city");
  const country = searchParams.get("country");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCityHotels();
  }, [city, country]);

  const fetchCityHotels = async () => {
    if (!city) return;

    setLoading(true);
    try {
      let query = supabase
        .from("hotels")
        .select("id, name, slug, address, city, country, description, images, about_us_image, latitude, longitude, is_verified, is_featured")
        .eq("status", "active")
        .eq("show_on_landing", true)
        .eq("city", city);

      if (country) {
        query = query.eq("country", country);
      }

      const { data: hotelsData, error } = await query;

      if (error) throw error;

      if (hotelsData) {
        // Fetch reviews for each hotel
        const hotelsWithReviews = await Promise.all(
          hotelsData.map(async (hotel) => {
            const { data: reviews } = await supabase
              .from("reviews")
              .select("rating")
              .eq("hotel_id", hotel.id)
              .eq("status", "approved");

            const avgRating = reviews && reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : undefined;

            return {
              ...hotel,
              avgRating,
              reviewCount: reviews?.length || 0,
            };
          })
        );

        setHotels(hotelsWithReviews);
      }
    } catch (error) {
      console.error("Error fetching city hotels:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">City not specified</h2>
          <Link to="/">
            <Button>Go back to homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-gradient-nav backdrop-blur-2xl border-b border-border/40 z-50 shadow-md">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                WIXOTEL
              </span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4 md:px-6">
        <div className="container mx-auto">
          {/* Title Section */}
          <div className="mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary border border-primary/20">
              <MapPin className="h-4 w-4" />
              <span>{country || "DESTINATION"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Hotels in {city}
            </h1>
            <p className="text-lg text-muted-foreground">
              {loading ? (
                "Loading hotels..."
              ) : (
                `${hotels.length} ${hotels.length === 1 ? 'hotel' : 'hotels'} available`
              )}
            </p>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="lg:sticky lg:top-24 h-[600px]">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No hotels found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find any hotels in {city} at the moment.
              </p>
              <Link to="/">
                <Button>Explore other destinations</Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Hotels List */}
              <div className="space-y-6">
                {hotels.map((hotel) => (
                  <Card
                    key={hotel.id}
                    className="transition-all hover:shadow-elegant hover:border-primary/50 cursor-pointer"
                    onClick={() => window.location.href = `/hotel/${hotel.slug}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <CardTitle className="flex-1">{hotel.name}</CardTitle>
                        {hotel.avgRating && (
                          <div className="flex items-center gap-1 text-sm font-normal whitespace-nowrap">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span>{hotel.avgRating.toFixed(1)}</span>
                            {hotel.reviewCount > 0 && (
                              <span className="text-muted-foreground">
                                ({hotel.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {hotel.is_featured && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-2 py-0.5 text-xs">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Featured
                          </Badge>
                        )}
                        {hotel.is_verified && (
                          <Badge variant="outline" className="border-primary/50 text-primary px-2 py-0.5 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {hotel.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {hotel.description || "Discover comfort and luxury at this amazing property."}
                      </p>
                      {hotel.about_us_image && (
                        <div className="mt-4 rounded-lg overflow-hidden">
                          <img
                            src={hotel.about_us_image}
                            alt={hotel.name}
                            className="w-full h-48 object-cover transition-transform hover:scale-105"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map */}
              <div className="lg:sticky lg:top-24 h-[600px]">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <HotelsLeafletMap hotels={hotels} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityHotels;
