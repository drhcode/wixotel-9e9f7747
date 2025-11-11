import { MapPin } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CityData {
  city: string;
  hotelCount: number;
  country: string;
  imageUrl: string | null;
  isLoading?: boolean;
}

interface ExploreCitiesProps {
  userCountry: string | null;
  hotels: Array<{
    city: string | null;
    country: string | null;
    about_us_image: string | null;
  }>;
}

export const ExploreCities = ({ userCountry, hotels }: ExploreCitiesProps) => {
  const navigate = useNavigate();
  const [citiesWithImages, setCitiesWithImages] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userCountry) return;

    // Filter hotels by user's country and group by city
    const cityData = hotels
      .filter(h => h.country === userCountry && h.city)
      .reduce((acc, hotel) => {
        const city = hotel.city!;
        if (!acc[city]) {
          acc[city] = { 
            city, 
            hotelCount: 0, 
            country: userCountry,
            imageUrl: hotel.about_us_image || null,
            isLoading: false
          };
        }
        acc[city].hotelCount++;
        // Use first available image
        if (!acc[city].imageUrl && hotel.about_us_image) {
          acc[city].imageUrl = hotel.about_us_image;
        }
        return acc;
      }, {} as Record<string, CityData>);

    const cities = Object.values(cityData)
      .sort((a, b) => b.hotelCount - a.hotelCount)
      .slice(0, 12);

    if (cities.length === 0) return;

    const fetchCityImages = async () => {
      setIsLoading(true);
      setCitiesWithImages(cities);

      const updatedCities = await Promise.all(
        cities.map(async (city) => {
          // If hotel already has an image, use it
          if (city.imageUrl) {
            return city;
          }

          // Otherwise, fetch from Unsplash
          try {
            const { data, error } = await supabase.functions.invoke('fetch-city-image', {
              body: { cityName: city.city }
            });

            if (error) throw error;

            return {
              ...city,
              imageUrl: data?.imageUrl || null
            };
          } catch (error) {
            console.error(`Error fetching image for ${city.city}:`, error);
            return city;
          }
        })
      );

      setCitiesWithImages(updatedCities);
      setIsLoading(false);
    };

    fetchCityImages();
  }, [userCountry, hotels]);

  if (!userCountry || citiesWithImages.length === 0) return null;

  const handleCityClick = (city: string) => {
    navigate(`/city-hotels?country=${encodeURIComponent(userCountry)}&city=${encodeURIComponent(city)}`);
  };

  return (
    <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-accent/30 to-background">
      <div className="container mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
            <MapPin className="h-4 w-4" />
            <span>EXPLORE DESTINATIONS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Explore {userCountry}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover exceptional stays in the most sought-after destinations
          </p>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-8 pb-4 px-4">
            {citiesWithImages.map((cityData, index) => (
              <div
                key={cityData.city}
                className="flex-none cursor-pointer group animate-fade-in"
                onClick={() => handleCityClick(cityData.city)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  {/* City Image Circle */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-elegant transition-all group-hover:border-primary/50 group-hover:shadow-glow group-hover:scale-110">
                      {isLoading && !cityData.imageUrl ? (
                        <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
                          <MapPin className="h-12 w-12 text-muted-foreground animate-pulse" />
                        </div>
                      ) : cityData.imageUrl ? (
                        <img 
                          src={cityData.imageUrl} 
                          alt={cityData.city}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          <MapPin className="h-12 w-12 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Hotel Count Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-gradient-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-glow border-2 border-background">
                      {cityData.hotelCount}
                    </div>
                  </div>
                  
                  {/* City Name */}
                  <div className="text-center">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {cityData.city}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {cityData.hotelCount} {cityData.hotelCount === 1 ? 'Hotel' : 'Hotels'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};
