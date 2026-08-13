import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram, MapPin, Phone } from "lucide-react";
import HotelsLeafletMap from "@/components/HotelsLeafletMap";
import type { PublicHotel } from "./types";

interface HotelContactSectionProps {
  hotel: PublicHotel;
}

export const HotelContactSection = ({ hotel }: HotelContactSectionProps) => {
  return (
    <section id="contact" className="py-16 px-4 scroll-mt-16">
      <div className="container mx-auto">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Contact Us</h2>
            <p className="text-xl text-muted-foreground">Get in touch with us for any inquiries</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Details - Left */}
            <div className="space-y-6">
              {hotel.phone && (
                <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Phone</CardTitle>
                        <a
                          href={`tel:${hotel.phone}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {hotel.phone}
                        </a>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}

              <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Address</CardTitle>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {hotel.address}
                      </a>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Social Media Links */}
              {(hotel.facebook_url || hotel.instagram_url || hotel.google_business_url) && (
                <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg mb-4">Connect With Us</CardTitle>
                    <div className="flex items-center gap-4">
                      {hotel.facebook_url && (
                        <a
                          href={hotel.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center hover:from-primary/30 hover:to-primary/10 transition-all group"
                          aria-label="Visit our Facebook page"
                        >
                          <Facebook className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        </a>
                      )}
                      {hotel.instagram_url && (
                        <a
                          href={hotel.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center hover:from-primary/30 hover:to-primary/10 transition-all group"
                          aria-label="Visit our Instagram page"
                        >
                          <Instagram className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        </a>
                      )}
                      {hotel.google_business_url && (
                        <a
                          href={hotel.google_business_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center hover:from-primary/30 hover:to-primary/10 transition-all group"
                          aria-label="View on Google My Business"
                        >
                          <MapPin className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        </a>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* Map - Right */}
            <Card className="border-border/50 overflow-hidden h-full min-h-[400px]">
              <CardContent className="p-0 h-full min-h-[400px]">
                {hotel.latitude && hotel.longitude ? (
                  <HotelsLeafletMap
                    hotels={[
                      {
                        id: hotel.id,
                        name: hotel.name,
                        slug: hotel.slug,
                        latitude: hotel.latitude,
                        longitude: hotel.longitude,
                        city: hotel.city,
                        country: hotel.country,
                      },
                    ]}
                  />
                ) : (
                  <iframe
                    title={`Map of ${hotel.name}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.address || "")}&output=embed`}
                    className="w-full h-full min-h-[400px]"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
