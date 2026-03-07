import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, Calendar, Users, TrendingUp, Shield, Zap, MapPin, Navigation, CheckCircle2, DollarSign, Clock, Star, Search, Menu, Lock } from "lucide-react";
import { DemoModal } from "@/components/DemoModal";
import { BookingLookup } from "@/components/BookingLookup";
import heroImage from "@/assets/hotel-hero.jpg";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import HotelsLeafletMap from "@/components/HotelsLeafletMap";
import { ExploreCities } from "@/components/ExploreCities";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO, createWebsiteJsonLd, createOrganizationJsonLd } from "@/components/SEO";


interface PublicHotel {
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

const Landing = () => {
  const navigate = useNavigate();
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [bookingLookupOpen, setBookingLookupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<PublicHotel[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  
  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data?.session && window.location.pathname === "/") {
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    checkSession();
    
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchHotels();
    // Auto-detect user location on page load
    getUserLocation();
  }, []);


  useEffect(() => {
    // Update available cities when country changes
    if (selectedCountry !== "all") {
      const cities = hotels
        .filter(h => h.country === selectedCountry && h.city)
        .map(h => h.city as string)
        .filter((city, index, self) => self.indexOf(city) === index)
        .sort();
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
    setSelectedCity("all");
  }, [selectedCountry, hotels]);

  useEffect(() => {
    filterHotels();
    
    // Extract unique countries from hotels
    const countries = hotels
      .filter(h => h.country)
      .map(h => h.country as string)
      .filter((country, index, self) => self.indexOf(country) === index)
      .sort();
    setAvailableCountries(countries);
  }, [selectedCountry, selectedCity, hotels]);

  const fetchHotels = async () => {
    const { data } = await supabase
      .rpc('get_public_hotels_filtered', { p_show_on_landing: true });
    
    if (data) {
      // Fetch review stats for each hotel
      const hotelsWithReviews = await Promise.all(
        data.map(async (hotel) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('hotel_id', hotel.id)
            .eq('status', 'approved');
          
          if (reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            return {
              ...hotel,
              avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
              reviewCount: reviews.length,
            };
          }
          
          return hotel;
        })
      );
      
      setHotels(hotelsWithReviews);
      setFilteredHotels(hotelsWithReviews); // Initialize filtered hotels
    }
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 4.8) return "Exceptional";
    if (rating >= 4.5) return "Wonderful";
    if (rating >= 4.0) return "Amazing";
    if (rating >= 3.5) return "Great";
    if (rating >= 3.0) return "Good";
    return "Comfortable";
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.address) {
        const country = data.address.country;
        
        if (country) {
          setUserCountry(country);
          setSelectedCountry(country);
          // Don't set city to avoid exact match issues - just filter by country and sort by distance
          setTimeout(() => setSelectedCity("all"), 100);
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          reverseGeocode(location.lat, location.lng);
        },
        (error) => {
          console.log("Location access denied", error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filterHotels = () => {
    let filtered = [...hotels];

    // Filter by country
    if (selectedCountry !== "all") {
      filtered = filtered.filter(h => h.country?.trim() === selectedCountry.trim());
    }

    // Filter by city
    if (selectedCity !== "all") {
      filtered = filtered.filter(h => h.city?.trim() === selectedCity.trim());
    }

    // Sort by distance if user location is available, otherwise by highest review
    if (userLocation) {
      filtered = filtered
        .map(hotel => ({
          ...hotel,
          distance: hotel.latitude && hotel.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, Number(hotel.latitude), Number(hotel.longitude))
            : Infinity
        }))
        .sort((a: any, b: any) => {
          // Featured hotels first
          if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1;
          return a.distance - b.distance;
        });
    } else {
      filtered = filtered.sort((a, b) => {
        // Featured hotels first
        if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1;
        const aRating = a.avgRating ?? 0;
        const bRating = b.avgRating ?? 0;
        if (bRating !== aRating) return bRating - aRating;
        const aCount = a.reviewCount ?? 0;
        const bCount = b.reviewCount ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        return a.name.localeCompare(b.name);
      });
    }

    setFilteredHotels(filtered);
  };

  const sortByLocation = () => {
    getUserLocation();
  };
  
  const features = [
    {
      icon: Hotel,
      title: "Hotel Management",
      description: "Manage multiple properties, rooms, and amenities from one central dashboard"
    },
    {
      icon: Calendar,
      title: "Smart Booking",
      description: "Advanced calendar system with real-time availability and instant confirmations"
    },
    {
      icon: Users,
      title: "Guest Management",
      description: "Track guest preferences, history, and provide personalized experiences"
    },
    {
      icon: TrendingUp,
      title: "Analytics & Reports",
      description: "Comprehensive insights into occupancy rates, revenue, and performance metrics"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access control and data protection"
    },
    {
      icon: Zap,
      title: "AI-Powered",
      description: "Smart pricing suggestions and automated guest communication with GPT-5"
    }
  ];


  return (
    <>
      <SEO
        title="Hotel Management Platform"
        description="WIXOTEL is the complete platform for modern hotel management. Manage rooms, bookings, and guests efficiently with our powerful tools."
        canonicalUrl="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [createWebsiteJsonLd(), createOrganizationJsonLd()],
        }}
      />
      <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gradient-nav backdrop-blur-2xl border-b border-border/40 z-[100] shadow-md">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/hotels" className="text-sm font-medium hover:text-primary transition-colors">
                Hotels
              </Link>
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingLookupOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find My Booking
              </Button>
              <Link to="/auth">
                <Button className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105 hover:shadow-glow" size="sm">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingLookupOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Find My Booking</span>
              </Button>
              <LanguageSwitcher />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] z-[110]">
                  <div className="flex flex-col gap-6 mt-8">
                    <Link 
                      to="/hotels" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Hotels
                    </Link>
                    <Link 
                      to="/about" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      About Us
                    </Link>
                    <Link 
                      to="/register-hotel"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Hotel className="h-4 w-4 mr-2" />
                        Register Hotel
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow">
                        Login
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none">
          <div className="absolute top-40 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-40 left-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-medium border border-primary/20 shadow-sm">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-foreground">AI-Powered Hotel Management</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-primary bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(var(--primary)/0.3)]">
                  Elevate
                </span>{" "}
                Your Hotel Experience
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                The ultimate platform for modern hospitality. Seamlessly manage rooms, bookings, guests, and revenue with intelligent automation.
              </p>
              
              {/* Feature Highlights */}
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Fast & Secure Booking</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Instant Confirmations</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-sm">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Bank-Level Security</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/register-hotel">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-[1.02] font-semibold"
                  >
                    <Hotel className="mr-2 h-5 w-5" />
                    Register Your Hotel
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 hover:border-primary hover:bg-primary/5 transition-all hover:shadow-md hover:scale-[1.02]"
                  onClick={() => window.open('https://wa.me/355682041518?text=Hello!%20I%27m%20interested%20in%20scheduling%20a%20demo%20of%20Wixotel.%20Could%20you%20please%20provide%20more%20information%20about%20your%20hotel%20management%20platform%3F', '_blank')}
                >
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Request Demo
                </Button>
              </div>
              <div className="flex items-center gap-12 pt-8">
                <div className="group cursor-pointer">
                  <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:scale-110 transition-all duration-300">30+</div>
                  <div className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">Active Hotels</div>
                </div>
                <div className="group cursor-pointer">
                  <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:scale-110 transition-all duration-300">99.9%</div>
                  <div className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">Uptime</div>
                </div>
              </div>
            </div>
            <div className="relative animate-scale-in">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full animate-pulse"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/40 hover:shadow-glow transition-all duration-500 hover:scale-[1.02]">
                <img 
                  src={heroImage} 
                  alt="Modern hotel management dashboard interface" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />

      {/* Explore Cities Section */}
      <ExploreCities userCountry={userCountry} hotels={hotels} />

      {/* Hotels Section */}
      {hotels.length > 0 && (
        <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background to-accent/30">
          <div className="container mx-auto">
            <div className="text-center mb-16 space-y-4 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
                <Hotel className="h-4 w-4" />
                <span>DISCOVER HOTELS</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Find Your Perfect Stay</h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Explore our collection of premium hotels powered by Wixotel
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-4xl mx-auto">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {availableCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {availableCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={sortByLocation}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Near Me
              </Button>
            </div>

            {/* Hotels Grid with Map */}
            <div className="grid lg:grid-cols-[1fr,550px] gap-8">
              {/* Hotels List - 2 per row, 4 total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
              {filteredHotels.slice(0, 4).map((hotel) => (
                <Link key={hotel.id} to={`/hotel/${hotel.slug}`} className="h-full">
                  <Card className="h-full flex flex-col group overflow-hidden bg-gradient-card border-border/50 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-video relative overflow-hidden bg-accent">
                      {hotel.about_us_image ? (
                        <img 
                          src={hotel.about_us_image} 
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : hotel.images?.[0] ? (
                        <img 
                          src={hotel.images[0]} 
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Hotel className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="flex-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors flex-1 min-w-0">{hotel.name}</CardTitle>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hotel.is_featured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-2 py-0.5 text-xs">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </Badge>
                          )}
                          {hotel.is_verified && (
                            <div className="bg-primary/10 text-primary rounded-full p-1" title="Verified">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {hotel.avgRating && hotel.reviewCount && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 transition-all ${
                                  i < Math.floor(hotel.avgRating!)
                                    ? "fill-star-filled text-star-filled"
                                    : i < hotel.avgRating!
                                    ? "fill-star-half text-star-half opacity-50"
                                    : "text-star-empty"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {hotel.avgRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {getRatingLabel(hotel.avgRating)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({hotel.reviewCount})
                          </span>
                        </div>
                      )}
                      
                      <CardDescription className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{hotel.city && hotel.country ? `${hotel.city}, ${hotel.country}` : hotel.address}</span>
                      </CardDescription>
                    </CardHeader>
                    {hotel.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{hotel.description}</p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
              </div>

              {/* Map - Visible on all devices */}
              <div className="w-full relative z-10">
                <div className="h-[400px] lg:h-[720px] rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-border/40">
                  <HotelsLeafletMap 
                    hotels={filteredHotels}
                    onHotelClick={(slug) => navigate(`/hotel/${slug}`)}
                  />
                </div>
              </div>
            </div>

            {/* View All Hotels Button */}
            <div className="text-center mt-12 animate-fade-in">
              <Link to="/hotels">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-[1.02] font-semibold"
                >
                  View All Hotels
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </div>


            {filteredHotels.length === 0 && (
              <div className="text-center py-12">
                <Hotel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No hotels found with the selected filters</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Why Book Through Wixotel Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
        <div className="container mx-auto relative">
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
              <CheckCircle2 className="h-4 w-4" />
              <span>WHY WIXOTEL</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Why Book Through Wixotel?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience seamless booking with unmatched benefits
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <Card className="group border-border/50 bg-gradient-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <DollarSign className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">Best Price Guarantee</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  We guarantee the lowest rates. Find a better price and we'll match it plus give you 10% off.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-border/50 bg-gradient-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">Instant Confirmation</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Get immediate booking confirmation and access to your reservation details 24/7.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-border/50 bg-gradient-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">Free Cancellation</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Flexible cancellation policies on most rooms. Plans change? No worries, we've got you covered.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-border/50 bg-gradient-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">Verified Reviews</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Read authentic reviews from real guests to make informed booking decisions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-accent/50 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent"></div>
        <div className="container mx-auto relative">
          <div className="text-center mb-20 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
              <Zap className="h-4 w-4" />
              <span>POWERFUL FEATURES</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything You Need to Succeed</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Enterprise-grade tools designed to transform your hotel operations and accelerate growth
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group border-border/50 bg-gradient-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:shadow-lg group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-primary/10 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="container mx-auto relative max-w-5xl">
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
              <Users className="h-4 w-4" />
              <span>REFERRAL PROGRAM</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Become a Referral Partner</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Earn 10% commission on every hotel you refer. Join our partner program and start earning today!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Generous Commission</h3>
                  <p className="text-muted-foreground">Earn 10% commission on every successful hotel referral, paid monthly.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Track Your Earnings</h3>
                  <p className="text-muted-foreground">Access real-time dashboard with detailed statistics and earnings reports.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Easy to Join</h3>
                  <p className="text-muted-foreground">Simple application process. Get approved and start referring hotels immediately.</p>
                </div>
              </div>
            </div>

            <Card className="shadow-card-hover border-primary/30">
              <CardHeader>
                <CardTitle>Apply as a Referral Partner</CardTitle>
                <CardDescription>Fill out the form below and we'll review your application</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                  const originalText = submitBtn.textContent;
                  
                  submitBtn.disabled = true;
                  submitBtn.textContent = "Submitting...";
                  
                  const formData = new FormData(form);
                  const data = {
                    full_name: (formData.get('full_name') as string)?.trim(),
                    email: (formData.get('email') as string)?.trim(),
                    phone: (formData.get('phone') as string)?.trim() || null,
                    message: (formData.get('message') as string)?.trim() || null,
                  };

                  try {
                    if (!data.full_name || !data.email) {
                      throw new Error("Please fill in all required fields");
                    }

                    const { error } = await supabase
                      .from('referral_applications')
                      .insert([data]);

                    if (error) throw error;

                    toast.success("Application submitted! We'll review it and get back to you soon.", {
                      duration: 5000,
                    });
                    form.reset();
                  } catch (error: any) {
                    console.error("Referral application error:", error);
                    toast.error(error.message || "Failed to submit application. Please try again.");
                  } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                  }
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="ref_full_name">Full Name *</Label>
                    <Input id="ref_full_name" name="full_name" required placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="ref_email">Email *</Label>
                    <Input id="ref_email" name="email" type="email" required placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="ref_phone">Phone</Label>
                    <Input id="ref_phone" name="phone" type="tel" placeholder="+1234567890" />
                  </div>
                  <div>
                    <Label htmlFor="ref_message">Why do you want to join? (Optional)</Label>
                    <Textarea id="ref_message" name="message" rows={3} placeholder="Tell us about your network and experience..." />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow">
                    Submit Application
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 md:px-6 border-t border-border/40 bg-gradient-footer overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="container mx-auto relative">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
              <p className="text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
                Modern hotel management for the digital age. Empowering hospitality businesses worldwide with cutting-edge technology.
              </p>
              <div className="flex gap-4 mt-6">
                <Link to="/register-hotel">
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90 transition-all shadow-md hover:shadow-lg">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-foreground">Legal</h3>
              <div className="space-y-3">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 duration-200">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 duration-200">Terms of Service</Link>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-cookie-settings"))}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 duration-200"
                >
                  Manage Cookies
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-foreground">Contact</h3>
              <div className="space-y-3">
                <a href="mailto:support@wixotel.com" className="block text-sm text-primary hover:underline transition-all hover:translate-x-1 duration-200">
                  support@wixotel.com
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground text-center md:text-left">© 2025 WIXOTEL. All rights reserved. GDPR Compliant.</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure & Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <BookingLookup open={bookingLookupOpen} onOpenChange={setBookingLookupOpen} />
    </div>
    </>
  );
};

export default Landing;
