import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface CityData {
  city: string;
  hotelCount: number;
  country: string;
}

interface ExploreCitiesProps {
  userCountry: string | null;
  hotels: Array<{
    city: string | null;
    country: string | null;
  }>;
}

export const ExploreCities = ({ userCountry, hotels }: ExploreCitiesProps) => {
  const navigate = useNavigate();

  if (!userCountry) return null;

  // Filter hotels by user's country and group by city
  const cityData = hotels
    .filter(h => h.country === userCountry && h.city)
    .reduce((acc, hotel) => {
      const city = hotel.city!;
      if (!acc[city]) {
        acc[city] = { city, hotelCount: 0, country: userCountry };
      }
      acc[city].hotelCount++;
      return acc;
    }, {} as Record<string, CityData>);

  const cities = Object.values(cityData)
    .sort((a, b) => b.hotelCount - a.hotelCount)
    .slice(0, 12);

  if (cities.length === 0) return null;

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
            These popular destinations have a lot to offer
          </p>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-6 pb-4">
            {cities.map((cityData, index) => (
              <Card
                key={cityData.city}
                className="flex-none w-[280px] cursor-pointer transition-all hover:shadow-elegant hover:scale-105 hover:border-primary/50 bg-card/80 backdrop-blur-sm animate-fade-in"
                onClick={() => handleCityClick(cityData.city)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                        <MapPin className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {cityData.hotelCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cityData.hotelCount === 1 ? 'Hotel' : 'Hotels'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{cityData.city}</h3>
                      <p className="text-sm text-muted-foreground">{userCountry}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};
