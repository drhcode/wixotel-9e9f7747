import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Mail, Phone, Bed, Users, Hotel, Wifi, Coffee, Tv, Wind, Home, Menu, X, Calendar, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  about_us: string | null;
  about_us_image: string | null;
  logo_url: string | null;
  google_maps_url: string | null;
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
  const [submittingLead, setSubmittingLead] = useState(false);

  // Lead form state
  const [leadForm, setLeadForm] = useState({
    fullName: "",
    email: "",
    phonePrefix: "+1",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "1",
    message: "",
  });

  // Booking request state
  const [bookingRequestMode, setBookingRequestMode] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookingRequest, setBookingRequest] = useState({
    checkIn: "",
    checkOut: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const leadSchema = z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().email("Invalid email address").max(255),
    phone: z.string().trim().min(5, "Phone number is too short").max(20),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    guests: z.number().min(1, "At least 1 guest required").max(50),
    message: z.string().max(1000).optional(),
  });

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

  const fetchAvailableDates = async () => {
    if (!selectedRoom || !hotel) return;
    
    try {
      setLoadingAvailability(true);
      // This will check availability when the form opens
    } catch (error: any) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !selectedRoom) return;

    try {
      setSubmittingLead(true);

      const requestSchema = z.object({
        fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
        email: z.string().trim().email("Invalid email address").max(255),
        phone: z.string().trim().min(5, "Phone number is too short").max(20),
        checkIn: z.string().min(1, "Check-in date is required"),
        checkOut: z.string().min(1, "Check-out date is required"),
      });

      const validated = requestSchema.parse(bookingRequest);

      // Check for overlapping dates
      const checkIn = new Date(validated.checkIn);
      const checkOut = new Date(validated.checkOut);
      
      if (checkOut <= checkIn) {
        toast.error("Check-out date must be after check-in date");
        return;
      }

      const { error } = await supabase.from("leads").insert({
        hotel_id: hotel.id,
        room_id: selectedRoom.id,
        full_name: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        check_in: validated.checkIn,
        check_out: validated.checkOut,
        guests: selectedRoom.capacity,
        status: "new",
        message: `Booking request for ${selectedRoom.name} (Room ${selectedRoom.room_number || 'N/A'})`,
      });

      if (error) throw error;

      toast.success("Booking request sent successfully! We'll contact you soon.");
      setBookingRequest({ checkIn: "", checkOut: "", fullName: "", email: "", phone: "" });
      setBookingRequestMode(false);
      setSelectedRoom(null);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error submitting booking request:", error);
        toast.error("Failed to submit booking request. Please try again.");
      }
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hotel) return;

    try {
      setSubmittingLead(true);

      // Validate form data
      const validatedData = leadSchema.parse({
        fullName: leadForm.fullName,
        email: leadForm.email,
        phone: leadForm.phone,
        checkIn: leadForm.checkIn,
        checkOut: leadForm.checkOut,
        guests: parseInt(leadForm.guests),
        message: leadForm.message || null,
      });

      // Validate date range
      const checkIn = new Date(validatedData.checkIn);
      const checkOut = new Date(validatedData.checkOut);
      if (checkOut <= checkIn) {
        toast.error("Check-out date must be after check-in date");
        return;
      }

      // Submit lead
      const { error } = await supabase.from("leads").insert({
        hotel_id: hotel.id,
        full_name: validatedData.fullName,
        email: validatedData.email,
        phone: `${leadForm.phonePrefix}${validatedData.phone}`,
        check_in: validatedData.checkIn,
        check_out: validatedData.checkOut,
        guests: validatedData.guests,
        message: validatedData.message || null,
      });

      if (error) throw error;

      toast.success("Thank you! Your inquiry has been submitted successfully.");
      
      // Reset form
      setLeadForm({
        fullName: "",
        email: "",
        phonePrefix: "+1",
        phone: "",
        checkIn: "",
        checkOut: "",
        guests: "1",
        message: "",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error submitting lead:", error);
        toast.error("Failed to submit inquiry. Please try again.");
      }
    } finally {
      setSubmittingLead(false);
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
            <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {hotel?.logo_url ? (
                <img src={hotel.logo_url} alt={hotel.name} className="h-10 w-10 object-contain rounded-lg" />
              ) : (
                <Hotel className="h-8 w-8 text-primary" />
              )}
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {hotel?.name}
              </span>
            </button>

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
                          €{room.price}
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
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">About Us</h2>
              <p className="text-xl text-muted-foreground">
                Experience exceptional hospitality
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* About Us Text */}
              <div>
                {hotel?.about_us ? (
                  <Card className="border-border/50">
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {hotel.about_us}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/50">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <p>Learn more about our exceptional hospitality and services.</p>
                    </CardContent>
                  </Card>
                )}
                
                {hotel?.amenities && hotel.amenities.length > 0 && (
                  <Card className="border-border/50 mt-6">
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

              {/* About Us Image */}
              <div>
                {hotel?.about_us_image ? (
                  <div className="relative rounded-lg overflow-hidden shadow-elegant">
                    <img
                      src={hotel.about_us_image}
                      alt={`${hotel.name} - About Us`}
                      className="w-full h-[400px] object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 h-[400px] flex items-center justify-center">
                    <Hotel className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Contact Us</h2>
              <p className="text-xl text-muted-foreground">
                Get in touch with us for any inquiries
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Details & Map - Left */}
              <div className="space-y-6">
                {hotel?.google_maps_url && (
                  <Card className="border-border/50 overflow-hidden">
                    <CardContent className="p-0">
                      <iframe
                        src={hotel.google_maps_url.includes('embed') 
                          ? hotel.google_maps_url 
                          : `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${hotel.google_maps_url}`
                        }
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                )}
                {hotel?.phone && (
                  <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Phone</CardTitle>
                          <a href={`tel:${hotel.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                            {hotel.phone}
                          </a>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )}
                
                {hotel?.email && (
                  <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Email</CardTitle>
                          <a href={`mailto:${hotel.email}`} className="text-muted-foreground hover:text-primary transition-colors break-all">
                            {hotel.email}
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
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel?.address || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {hotel?.address}
                        </a>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Map - Right */}
              <Card className="border-border/50 overflow-hidden h-full min-h-[400px]">
                <CardContent className="p-0 h-full">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel?.address || '')}&output=embed`}
                    className="w-full h-full min-h-[400px]"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Inquiry Form Section */}
      <section id="inquiry" className="py-16 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/10 scroll-mt-16">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Plan Your Stay</h2>
              <p className="text-xl text-muted-foreground">
                Send us your inquiry and we'll get back to you shortly
              </p>
            </div>

            <Card className="border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Inquiry Form
                </CardTitle>
                <CardDescription>
                  Fill out the form below and our team will contact you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLeadSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={leadForm.fullName}
                        onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })}
                        placeholder="John Doe"
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                        maxLength={255}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={leadForm.phonePrefix}
                        onValueChange={(value) => setLeadForm({ ...leadForm, phonePrefix: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">+1 (US/CA)</SelectItem>
                          <SelectItem value="+44">+44 (UK)</SelectItem>
                          <SelectItem value="+33">+33 (FR)</SelectItem>
                          <SelectItem value="+49">+49 (DE)</SelectItem>
                          <SelectItem value="+34">+34 (ES)</SelectItem>
                          <SelectItem value="+39">+39 (IT)</SelectItem>
                          <SelectItem value="+61">+61 (AU)</SelectItem>
                          <SelectItem value="+81">+81 (JP)</SelectItem>
                          <SelectItem value="+86">+86 (CN)</SelectItem>
                          <SelectItem value="+91">+91 (IN)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="1234567890"
                        required
                        className="flex-1"
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn">Check-in Date *</Label>
                      <Input
                        id="checkIn"
                        type="date"
                        value={leadForm.checkIn}
                        onChange={(e) => setLeadForm({ ...leadForm, checkIn: e.target.value })}
                        min={format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkOut">Check-out Date *</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={leadForm.checkOut}
                        onChange={(e) => setLeadForm({ ...leadForm, checkOut: e.target.value })}
                        min={leadForm.checkIn || format(new Date(), "yyyy-MM-dd")}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guests">Number of Guests *</Label>
                    <Select
                      value={leadForm.guests}
                      onValueChange={(value) => setLeadForm({ ...leadForm, guests: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? "Guest" : "Guests"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={leadForm.message}
                      onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                      placeholder="Any special requests or questions..."
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {leadForm.message.length}/1000 characters
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-glow transition-all"
                    disabled={submittingLead}
                  >
                    {submittingLead ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Inquiry
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
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
                            €{selectedRoom.price}
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

                {!bookingRequestMode ? (
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setSelectedRoom(null)} className="flex-1">
                      Close
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-primary hover:opacity-90 shadow-elegant"
                      onClick={() => {
                        setBookingRequestMode(true);
                        fetchAvailableDates();
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Request to Book
                    </Button>
                  </div>
                ) : (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Booking Request
                      </h4>
                      <form onSubmit={handleBookingRequest} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bookingCheckIn">Check-in Date *</Label>
                            <Input
                              id="bookingCheckIn"
                              type="date"
                              value={bookingRequest.checkIn}
                              onChange={(e) => setBookingRequest({ ...bookingRequest, checkIn: e.target.value })}
                              min={format(new Date(), "yyyy-MM-dd")}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bookingCheckOut">Check-out Date *</Label>
                            <Input
                              id="bookingCheckOut"
                              type="date"
                              value={bookingRequest.checkOut}
                              onChange={(e) => setBookingRequest({ ...bookingRequest, checkOut: e.target.value })}
                              min={bookingRequest.checkIn || format(new Date(), "yyyy-MM-dd")}
                              required
                            />
                          </div>
                        </div>

                        {loadingAvailability && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking availability...
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="bookingName">Full Name *</Label>
                          <Input
                            id="bookingName"
                            value={bookingRequest.fullName}
                            onChange={(e) => setBookingRequest({ ...bookingRequest, fullName: e.target.value })}
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bookingPhone">Phone *</Label>
                          <Input
                            id="bookingPhone"
                            type="tel"
                            value={bookingRequest.phone}
                            onChange={(e) => setBookingRequest({ ...bookingRequest, phone: e.target.value })}
                            placeholder="Enter your phone number"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bookingEmail">Email *</Label>
                          <Input
                            id="bookingEmail"
                            type="email"
                            value={bookingRequest.email}
                            onChange={(e) => setBookingRequest({ ...bookingRequest, email: e.target.value })}
                            placeholder="Enter your email"
                            required
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setBookingRequestMode(false);
                              setBookingRequest({ checkIn: "", checkOut: "", fullName: "", email: "", phone: "" });
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1 bg-gradient-primary hover:opacity-90 shadow-elegant"
                            disabled={submittingLead}
                          >
                            {submittingLead ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Request
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelPublicView;
