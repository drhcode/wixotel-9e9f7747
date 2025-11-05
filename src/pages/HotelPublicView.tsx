import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  Loader2,
  MapPin,
  Mail,
  Phone,
  Bed,
  Users,
  Hotel,
  Wifi,
  Coffee,
  Tv,
  Wind,
  Home,
  Menu,
  X,
  Calendar,
  Send,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Star,
  MessageSquare,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { ReviewModal } from "@/components/hotel/ReviewModal";
import { BookingLookup } from "@/components/BookingLookup";

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
  facebook_url: string | null;
  instagram_url: string | null;
  google_business_url: string | null;
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
  images: string[] | null;
}

interface Review {
  id: string;
  title: string;
  rating: number;
  review_text: string;
  photo_url: string | null;
  guest_email: string;
  created_at: string;
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
  const [userCountry, setUserCountry] = useState<string>("US");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [bookingLookupOpen, setBookingLookupOpen] = useState(false);

  // Track page analytics
  useAnalyticsTracking(hotel?.id, `/hotel/${hotelSlug}`);

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
  const [isRoomAvailable, setIsRoomAvailable] = useState(true);
  const [bookingRequest, setBookingRequest] = useState({
    checkIn: undefined as Date | undefined,
    checkOut: undefined as Date | undefined,
    fullName: "",
    email: "",
    phone: "",
    guests: 1,
  });
  const [bookingCheckInOpen, setBookingCheckInOpen] = useState(false);
  const [bookingCheckOutOpen, setBookingCheckOutOpen] = useState(false);

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
    detectUserCountry();
  }, [hotelSlug]);

  useEffect(() => {
    if (hotel?.id) {
      fetchReviews();
    }
  }, [hotel?.id]);

  const detectUserCountry = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      if (data.country_code) {
        setUserCountry(data.country_code);
      }
    } catch (error) {
      console.error("Failed to detect country:", error);
    }
  };

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

  const fetchReviews = async () => {
    if (!hotel?.id) return;

    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("hotel_id", hotel.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkRoomAvailability = async (checkIn: Date, checkOut: Date) => {
    if (!selectedRoom || !hotel) return;

    try {
      setLoadingAvailability(true);
      
      // Check if there are any overlapping bookings
      const { data, error } = await supabase.rpc('check_booking_overlap', {
        p_room_id: selectedRoom.id,
        p_check_in: format(checkIn, "yyyy-MM-dd"),
        p_check_out: format(checkOut, "yyyy-MM-dd"),
      });

      if (error) throw error;
      
      setIsRoomAvailable(!data);
    } catch (error: any) {
      console.error("Error checking availability:", error);
      toast.error("Failed to check availability");
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
        checkIn: z.date({ required_error: "Check-in date is required" }),
        checkOut: z.date({ required_error: "Check-out date is required" }),
        guests: z.number().min(1, "At least 1 guest required"),
      });

      const validated = requestSchema.parse(bookingRequest);

      // Check for overlapping dates
      const checkIn = validated.checkIn;
      const checkOut = validated.checkOut;

      if (checkOut <= checkIn) {
        toast.error("Check-out date must be after check-in date");
        return;
      }

      // Calculate total amount and nights
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = selectedRoom.price * nights;

      const leadData = {
        hotel_id: hotel.id,
        room_id: selectedRoom.id,
        full_name: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        check_in: format(validated.checkIn, "yyyy-MM-dd"),
        check_out: format(validated.checkOut, "yyyy-MM-dd"),
        guests: validated.guests,
        status: "new",
        message: `Booking request for ${selectedRoom.name} (Room ${selectedRoom.room_number || "N/A"})`,
      };
      
      console.log("Submitting lead with data:", leadData);
      
      const { error } = await supabase.from("leads").insert(leadData);

      if (error) {
        console.error("Database error inserting lead:", error);
        throw error;
      }

      // Note: Earnings will be created when hotel accepts the booking request

      // Send emails via Edge Function (hotel + guest)
      try {
        const { createLeadConfirmationEmail, createHotelNotificationEmail } = await import('@/lib/emailTemplates');
        
        const hotelForEmail = {
          name: hotel.name,
          email: hotel.email,
          phone: hotel.phone,
          address: hotel.address,
          city: null,
          country: null,
        };

        // Send notification to hotel
        if (hotel.email) {
          const hotelHtmlContent = createHotelNotificationEmail({
            guestName: validated.fullName,
            guestEmail: validated.email,
            guestPhone: validated.phone,
            checkIn: format(validated.checkIn, 'PPP'),
            checkOut: format(validated.checkOut, 'PPP'),
            guests: validated.guests,
            message: `Booking request for ${selectedRoom.name} (Room ${selectedRoom.room_number || "N/A"})`,
            hotel: hotelForEmail,
          });

          await supabase.functions.invoke('send-email', {
            body: {
              hotel_id: hotel.id,
              recipient_email: hotel.email,
              subject: `New Booking Inquiry - ${validated.fullName}`,
              email_type: 'new_lead',
              html_content: hotelHtmlContent,
            },
          });
        }

        // Send confirmation to guest
        const guestHtmlContent = createLeadConfirmationEmail({
          guestName: validated.fullName,
          checkIn: format(validated.checkIn, 'PPP'),
          checkOut: format(validated.checkOut, 'PPP'),
          guests: validated.guests,
          hotel: hotelForEmail,
        });

        await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotel.id,
            recipient_email: validated.email,
            subject: `Booking Request Received - ${hotel.name}`,
            email_type: 'lead_confirmation',
            html_content: guestHtmlContent,
          },
        });
      } catch (emailErr) {
        console.error('Error sending lead emails:', emailErr);
      }

      toast.success("Booking request sent successfully! We'll contact you soon.");
      setBookingRequest({ checkIn: undefined, checkOut: undefined, fullName: "", email: "", phone: "", guests: 1 });
      setBookingRequestMode(false);
      setSelectedRoom(null);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error submitting booking request:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(`Failed to submit booking request: ${error.message || "Please try again."}`);
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

      // Send emails via Edge Function (hotel + guest)
      try {
        if (hotel.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              hotel_id: hotel.id,
              recipient_email: hotel.email,
              subject: `New Inquiry - ${validatedData.fullName}`,
              email_type: 'new_lead',
              html_content: `
                <h2>New Booking Inquiry</h2>
                <ul>
                  <li><strong>Name:</strong> ${validatedData.fullName}</li>
                  <li><strong>Email:</strong> ${validatedData.email}</li>
                  <li><strong>Phone:</strong> ${leadForm.phonePrefix}${validatedData.phone}</li>
                  <li><strong>Check-in:</strong> ${validatedData.checkIn}</li>
                  <li><strong>Check-out:</strong> ${validatedData.checkOut}</li>
                  <li><strong>Guests:</strong> ${validatedData.guests}</li>
                </ul>
              `,
            },
          });
        }
        await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotel.id,
            recipient_email: validatedData.email,
            subject: `Inquiry Received - ${hotel.name}`,
            email_type: 'lead_confirmation',
            html_content: `
              <h2>Booking Request Received</h2>
              <p>Dear ${validatedData.fullName},</p>
              <p>Thank you for contacting ${hotel.name}. We have received your request.</p>
            `,
          },
        });
      } catch (emailErr) {
        console.error('Error sending contact emails:', emailErr);
      }

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
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {hotel?.logo_url ? (
                <img src={hotel.logo_url} alt={hotel.name} className="h-10 w-10 object-contain rounded-lg" />
              ) : null}
              <div className="flex flex-col items-start leading-none">
                <span className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">{hotel?.name}</span>
                <span className="text-[9px] text-muted-foreground -mt-0.5">by wixotel</span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection("rooms")}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Rooms
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Contact Us
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingLookupOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find Booking
              </Button>
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
                  <button
                    onClick={() => scrollToSection("rooms")}
                    className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => scrollToSection("about")}
                    className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => scrollToSection("reviews")}
                    className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
                  >
                    Reviews
                  </button>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
                  >
                    Contact Us
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBookingLookupOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 mx-4"
                  >
                    <Search className="h-4 w-4" />
                    Find Booking
                  </Button>
                </div>
              </nav>
            )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto text-center space-y-6 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to <span className="bg-gradient-primary bg-clip-text text-transparent">{hotel?.name}</span>
          </h1>
          {hotel?.description && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{hotel.description}</p>
          )}
          <Button
            size="lg"
            onClick={() => scrollToSection("rooms")}
            className="bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-glow hover:scale-105 transition-all"
          >
            Explore Our Rooms
          </Button>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto">
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <h2 className="text-4xl font-bold tracking-tight">Our Rooms</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Discover comfort and luxury in every room</p>
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
                  className="group overflow-hidden hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in flex flex-col"
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
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{room.name}</CardTitle>
                    {room.room_type && <CardDescription className="text-base">{room.room_type}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 space-y-4">
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
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{room.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                      <div>
                        <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          €{room.price}
                        </div>
                        <div className="text-xs text-muted-foreground">per night</div>
                      </div>
                      <Button size="sm" className="group-hover:bg-gradient-primary transition-all">
                        View & Book
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
              <p className="text-xl text-muted-foreground">Experience exceptional hospitality</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* About Us Text */}
              <div>
                {hotel?.about_us ? (
                  <Card className="border-border/50">
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{hotel.about_us}</p>
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
              <p className="text-xl text-muted-foreground">Get in touch with us for any inquiries</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Details - Left */}
              <div className="space-y-6">
                {hotel?.phone && (
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

                {hotel?.email && (
                  <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Email</CardTitle>
                          <a
                            href={`mailto:${hotel.email}`}
                            className="text-muted-foreground hover:text-primary transition-colors break-all"
                          >
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
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel?.address || "")}`}
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

                {/* Social Media Links */}
                {(hotel?.facebook_url || hotel?.instagram_url || hotel?.google_business_url) && (
                  <Card className="border-border/50 hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg mb-4">Connect With Us</CardTitle>
                      <div className="flex items-center gap-4">
                        {hotel?.facebook_url && (
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
                        {hotel?.instagram_url && (
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
                        {hotel?.google_business_url && (
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
                <CardContent className="p-0 h-full">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel?.address || "")}&output=embed`}
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
      <section
        id="inquiry"
        className="py-16 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/10 scroll-mt-16"
      >
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Plan Your Stay</h2>
              <p className="text-xl text-muted-foreground">Send us your inquiry and we'll get back to you shortly</p>
            </div>

            <Card className="border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Inquiry Form
                </CardTitle>
                <CardDescription>Fill out the form below and our team will contact you</CardDescription>
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
                    <p className="text-xs text-muted-foreground">{leadForm.message.length}/1000 characters</p>
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

      {/* Reviews Section */}
      <section id="reviews" className="py-16 px-4 bg-gradient-to-b from-accent/30 to-background scroll-mt-16">
        <div className="container mx-auto">
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <h2 className="text-4xl font-bold tracking-tight">Guest Reviews</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what our guests have to say about their experience
            </p>
            <Button
              onClick={() => setReviewModalOpen(true)}
              className="bg-gradient-primary hover:opacity-90 shadow-elegant"
            >
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
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
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
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      {review.guest_email.substring(0, 2) + "***@" + review.guest_email.split("@")[1]}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-accent/20">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {hotel?.name}. All rights reserved.
          </p>
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
                {((selectedRoom.images && selectedRoom.images.length > 0) || selectedRoom.main_photo_url) && (
                  <div className="relative rounded-lg overflow-hidden">
                    {selectedRoom.images && selectedRoom.images.length > 0 ? (
                      <Carousel className="w-full">
                        <CarouselContent>
                          {selectedRoom.images.map((image, index) => (
                            <CarouselItem key={index}>
                              <div className="relative">
                                <img
                                  src={image}
                                  alt={`${selectedRoom.name} - Image ${index + 1}`}
                                  className="w-full h-72 object-cover"
                                />
                                {selectedRoom.room_number && index === 0 && (
                                  <Badge className="absolute top-4 right-4 bg-background/90 backdrop-blur">
                                    Room {selectedRoom.room_number}
                                  </Badge>
                                )}
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-4" />
                        <CarouselNext className="right-4" />
                      </Carousel>
                    ) : (
                      <div className="relative">
                        <img
                          src={selectedRoom.main_photo_url!}
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
                        setIsRoomAvailable(true);
                        setBookingRequest({
                          ...bookingRequest,
                          guests: selectedRoom.capacity,
                        });
                        // Scroll to the booking form
                        setTimeout(() => {
                          const formElement = document.querySelector('[data-booking-form]');
                          if (formElement) {
                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Request To Book
                    </Button>
                  </div>
                ) : (
                  <Card className="border-primary/20 bg-primary/5" data-booking-form>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Booking Request
                      </h4>
                      <form onSubmit={handleBookingRequest} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bookingCheckIn">Check-in Date *</Label>
                            <Popover open={bookingCheckInOpen} onOpenChange={setBookingCheckInOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !bookingRequest.checkIn && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {bookingRequest.checkIn ? (
                                    format(bookingRequest.checkIn, "MMM dd, yyyy")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={bookingRequest.checkIn}
                                  onSelect={(date) => {
                                    setBookingRequest({ ...bookingRequest, checkIn: date });
                                    if (date && bookingRequest.checkOut) {
                                      checkRoomAvailability(date, bookingRequest.checkOut);
                                    } else {
                                      setIsRoomAvailable(true);
                                    }
                                    setBookingCheckInOpen(false);
                                  }}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bookingCheckOut">Check-out Date *</Label>
                            <Popover open={bookingCheckOutOpen} onOpenChange={setBookingCheckOutOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !bookingRequest.checkOut && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {bookingRequest.checkOut ? (
                                    format(bookingRequest.checkOut, "MMM dd, yyyy")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={bookingRequest.checkOut}
                                  onSelect={(date) => {
                                    setBookingRequest({ ...bookingRequest, checkOut: date });
                                    if (date && bookingRequest.checkIn) {
                                      checkRoomAvailability(bookingRequest.checkIn, date);
                                    } else {
                                      setIsRoomAvailable(true);
                                    }
                                    setBookingCheckOutOpen(false);
                                  }}
                                  disabled={(date) => {
                                    const minDate = bookingRequest.checkIn || new Date();
                                    return date <= minDate;
                                  }}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {loadingAvailability && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking availability...
                          </div>
                        )}

                        {!loadingAvailability && !isRoomAvailable && bookingRequest.checkIn && bookingRequest.checkOut && (
                          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                            This room is not available for the selected dates. Please choose different dates.
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
                          <PhoneInput
                            international
                            defaultCountry={userCountry as any}
                            value={bookingRequest.phone}
                            onChange={(value) => setBookingRequest({ ...bookingRequest, phone: value || "" })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bookingGuests">Number of Guests *</Label>
                          <Input
                            id="bookingGuests"
                            type="number"
                            min="1"
                            max={selectedRoom.capacity}
                            value={bookingRequest.guests}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value <= selectedRoom.capacity) {
                                setBookingRequest({ ...bookingRequest, guests: value });
                              }
                            }}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Maximum capacity: {selectedRoom.capacity} guests
                          </p>
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
                              setIsRoomAvailable(true);
                              setBookingRequest({
                                checkIn: undefined,
                                checkOut: undefined,
                                fullName: "",
                                email: "",
                                phone: "",
                                guests: 1,
                              });
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 bg-gradient-primary hover:opacity-90 shadow-elegant"
                            disabled={submittingLead || !isRoomAvailable || loadingAvailability}
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

      {/* Review Modal */}
      {hotel && (
        <>
          <ReviewModal
            open={reviewModalOpen}
            onOpenChange={(open) => {
              setReviewModalOpen(open);
              if (!open) {
                fetchReviews(); // Refresh reviews after submission
              }
            }}
            hotelId={hotel.id}
            hotelName={hotel.name}
          />
          <BookingLookup open={bookingLookupOpen} onOpenChange={setBookingLookupOpen} />
        </>
      )}
    </div>
  );
};

export default HotelPublicView;
