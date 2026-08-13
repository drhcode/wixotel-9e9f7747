import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Hotel } from "lucide-react";
import type { PublicHotel } from "./types";

interface HotelAboutSectionProps {
  hotel: PublicHotel;
}

export const HotelAboutSection = ({ hotel }: HotelAboutSectionProps) => {
  return (
    <section id="about" className="relative py-20 px-4 scroll-mt-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-background to-accent/20 -z-10" />

      <div className="container mx-auto">
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">About Us</h2>
            <p className="text-xl text-muted-foreground">Experience exceptional hospitality</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* About Us Image - Left */}
            <div className="order-2 lg:order-1">
              {hotel.about_us_image ? (
                <div className="relative rounded-2xl overflow-hidden shadow-elegant group">
                  <img
                    src={hotel.about_us_image}
                    alt={`${hotel.name} - About Us`}
                    className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 h-[500px] flex items-center justify-center">
                  <Hotel className="h-32 w-32 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* About Us Text - Right */}
            <div className="order-1 lg:order-2 space-y-6">
              {hotel.about_us ? (
                <div className="space-y-6">
                  <p className="text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {hotel.about_us}
                  </p>
                </div>
              ) : (
                <div className="text-center lg:text-left">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Learn more about our exceptional hospitality and services.
                  </p>
                </div>
              )}

              {hotel.amenities && hotel.amenities.length > 0 && (
                <Card className="border-border/50 shadow-md bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Coffee className="h-6 w-6 text-primary" />
                      Hotel Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {hotel.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-sm font-medium">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
