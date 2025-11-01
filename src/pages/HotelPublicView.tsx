import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Mail, Phone, Bed, Users, Hotel, Wifi, Coffee, Tv, Wind, Home, Menu, X } from "lucide-react";
import { toast } from "sonner";

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  logo_url: string | null;
  amenities: string[] | null;
}

interface Room {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string | null;
  price: number;
  capacity: number;
  description: string | null;
  main_photo_url: string | null;
  square_meters: number | null;
  amenities: string[] | null;
  is_available: boolean;
}

const HotelPublicView = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, [hotelSlug]);

  const fetchHotelData = async () => {
    try {
      setLoading(true);

      // Fetch hotel by slug
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("*")
        .eq("slug", hotelSlug)
        .eq("status", "active")
        .maybeSingle();

      if (hotelError) throw hotelError;
      if (!hotelData) {
        toast.error("Hotel not found");
        navigate("/");
        return;
      }

      setHotel(hotelData);

      // Fetch available rooms for this hotel
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", hotelData.id)
        .eq("is_available", true)
        .order("price", { ascending: true });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);
    } catch (error: any) {
      console.error("Error fetching hotel data:", error);
      toast.error("Failed to load hotel information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hotel) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header with Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {hotel?.logo_url ? (
                <img src={hotel.logo_url} alt={hotel.name} className="h-10 w-10 object-contain rounded-lg" />
              ) : (
                <Hotel className="h-8 w-8 text-primary" />
              )}
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {hotel?.name}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("rooms")} className="text-sm font-medium hover:text-primary transition-colors">
                Rooms
              </button>
              <button onClick={() => scrollToSection("about")} className="text-sm font-medium hover:text-primary transition-colors">
                About Us
              </button>
              <button onClick={() => scrollToSection("contact")} className="text-sm font-medium hover:text-primary transition-colors">
                Contact Us
              </button>
            </nav>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t animate-fade-in">
              <div className="flex flex-col gap-4">
                <button onClick={() => scrollToSection("rooms")} className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors">
                  Rooms
                </button>
                <button onClick={() => scrollToSection("about")} className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors">
                  About Us
                </button>
                <button onClick={() => scrollToSection("contact")} className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors">
                  Contact Us
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto text-center space-y-6 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {hotel?.name}
            </span>
          </h1>
          {hotel?.description && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {hotel.description}
            </p>
          )}
          <Button size="lg" onClick={() => scrollToSection("rooms")} className="bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-glow hover:scale-105 transition-all">
            Explore Our Rooms
          </Button>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto">
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <h2 className="text-4xl font-bold tracking-tight">Our Rooms</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover comfort and luxury in every room
            </p>
          </div>
          
          {rooms.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                No rooms available at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {rooms.map((room, index) => (
                <Card 
                  key={room.id} 
                  className="group overflow-hidden hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="relative overflow-hidden">
                    {room.main_photo_url ? (
                      <img
                        src={room.main_photo_url}
                        alt={room.name}
                        className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Bed className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {room.room_number && (
                      <Badge className="absolute top-4 right-4 bg-background/90 backdrop-blur">
                        {room.room_number}
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {room.name}
                    </CardTitle>
                    {room.room_type && (
                      <CardDescription className="text-base">{room.room_type}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{room.capacity} guests</span>
                      </div>
                      {room.square_meters && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <span>{room.square_meters} m²</span>
                        </div>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          ${room.price}
                        </div>
                        <div className="text-xs text-muted-foreground">per night</div>
                      </div>
                      <Button size="sm" className="group-hover:bg-gradient-primary transition-all">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-16 px-4 bg-accent/50 scroll-mt-16">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">About Us</h2>
              <p className="text-xl text-muted-foreground">
                Experience exceptional hospitality
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{hotel?.address}</p>
                </CardContent>
              </Card>
              {hotel?.amenities && hotel.amenities.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5 text-primary" />
                      Hotel Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Contact Us</h2>
              <p className="text-xl text-muted-foreground">
                Get in touch with us for any inquiries
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {hotel?.phone && (
                <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                  <CardHeader>
                    <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                      <Phone className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-center text-lg">Phone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a href={`tel:${hotel.phone}`} className="text-center block text-muted-foreground hover:text-primary transition-colors">
                      {hotel.phone}
                    </a>
                  </CardContent>
                </Card>
              )}
              {hotel?.email && (
                <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                  <CardHeader>
                    <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-center text-lg">Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a href={`mailto:${hotel.email}`} className="text-center block text-muted-foreground hover:text-primary transition-colors break-all">
                      {hotel.email}
                    </a>
                  </CardContent>
                </Card>
              )}
              <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-center text-lg">Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">{hotel?.address}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-accent/20">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {hotel?.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* Room Details Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRoom && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedRoom.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {selectedRoom.main_photo_url && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={selectedRoom.main_photo_url}
                      alt={selectedRoom.name}
                      className="w-full h-72 object-cover"
                    />
                    {selectedRoom.room_number && (
                      <Badge className="absolute top-4 right-4 bg-background/90 backdrop-blur">
                        Room {selectedRoom.room_number}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {selectedRoom.room_type && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Room Type</h4>
                        <p className="text-lg">{selectedRoom.room_type}</p>
                      </div>
                    )}
                    {selectedRoom.description && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Description</h4>
                        <p className="text-muted-foreground leading-relaxed">{selectedRoom.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Card className="border-border/50 bg-accent/50">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                              <div className="text-sm text-muted-foreground">Capacity</div>
                              <div className="font-medium">Up to {selectedRoom.capacity} guests</div>
                            </div>
                          </div>
                        </div>
                        {selectedRoom.square_meters && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Home className="h-5 w-5 text-primary" />
                              <div>
                                <div className="text-sm text-muted-foreground">Room Size</div>
                                <div className="font-medium">{selectedRoom.square_meters} m²</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t">
                          <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            ${selectedRoom.price}
                          </div>
                          <div className="text-sm text-muted-foreground">per night</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Room Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setSelectedRoom(null)} className="flex-1">
                    Close
                  </Button>
                  <Button className="flex-1 bg-gradient-primary hover:opacity-90 shadow-elegant">
                    Book Now
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelPublicView;
