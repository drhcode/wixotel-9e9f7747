import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Calendar, Users, TrendingUp, Shield, Zap, MapPin, Navigation, CheckCircle2, DollarSign, Clock, Star, Search, Menu } from "lucide-react";
import { DemoModal } from "@/components/DemoModal";
import { BookingLookup } from "@/components/BookingLookup";
import heroImage from "@/assets/hotel-hero.jpg";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import HotelsLeafletMap from "@/components/HotelsLeafletMap";


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
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  
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
    fetchSubscriptionPlans();
    // Auto-detect user location on page load
    getUserLocation();
  }, []);

  const fetchSubscriptionPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (data) {
      setSubscriptionPlans(data);
    }
  };

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
      .from('hotels')
      .select('id, name, slug, address, city, country, description, images, about_us_image, latitude, longitude')
      .eq('status', 'active')
      .eq('show_on_landing', true);
    
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
        .sort((a: any, b: any) => a.distance - b.distance);
    } else {
      filtered = filtered.sort((a, b) => {
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

  const plans = subscriptionPlans.length > 0 
    ? subscriptionPlans.map((plan, index) => ({
        name: plan.name,
        price: `€${plan.price}`,
        period: `/${plan.billing_period}`,
        popular: index === 1, // Mark middle plan as popular
        features: plan.features || []
      }))
    : [
        {
          name: "Basic",
          price: "€15.99",
          period: "/month",
          features: [
            "Up to 10 rooms",
            "Basic booking calendar",
            "Guest management",
            "Email support",
            "Monthly reports"
          ]
        },
        {
          name: "Pro",
          price: "€19.99",
          period: "/month",
          popular: true,
          features: [
            "Up to 25 rooms",
            "Advanced calendar",
            "AI assistant",
            "Priority support",
            "Real-time analytics",
            "Custom branding"
          ]
        },
        {
          name: "Premium",
          price: "€22.99",
          period: "/month",
          features: [
            "Unlimited rooms",
            "White-label solution",
            "Dedicated support",
            "API access",
            "Advanced automation",
            "Multi-location support"
          ]
        }
      ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/50 z-50 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/hotels" className="text-sm font-medium hover:text-primary transition-colors">
                Hotels
              </Link>
              <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/register-hotel">
                <Button size="sm" variant="outline">
                  Register Hotel
                </Button>
              </Link>
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
                <Button className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105" size="sm">
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
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
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
                      <Button className="w-full bg-gradient-primary hover:opacity-90 transition-all shadow-elegant">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none"></div>
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-sm font-medium border border-primary/20 shadow-sm">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-foreground">AI-Powered Hotel Management</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                Elevate Your{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Hotel Experience
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                The ultimate platform for modern hospitality. Seamlessly manage rooms, bookings, guests, and revenue with intelligent automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/register-hotel">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-105"
                  >
                    <Hotel className="mr-2 h-5 w-5" />
                    Register Your Hotel
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => setIsDemoOpen(true)}
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-12 pt-8">
                <div className="group">
                  <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:scale-110 transition-transform">30+</div>
                  <div className="text-sm text-muted-foreground mt-1">Active Hotels</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:scale-110 transition-transform">99.9%</div>
                  <div className="text-sm text-muted-foreground mt-1">Uptime</div>
                </div>
              </div>
            </div>
            <div className="relative animate-scale-in">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full animate-pulse"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 hover:shadow-glow transition-shadow duration-500">
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

      {/* Hotels Section */}
      {hotels.length > 0 && (
        <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background to-accent/30">
          <div className="container mx-auto">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
                DISCOVER HOTELS
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Find Your Perfect Stay</h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
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
                  <Card className="h-full flex flex-col group overflow-hidden border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
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
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{hotel.name}</CardTitle>
                      
                      {hotel.avgRating && hotel.reviewCount && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(hotel.avgRating!)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : i < hotel.avgRating!
                                    ? "fill-yellow-400/50 text-yellow-400"
                                    : "text-muted-foreground"
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
              <div className="w-full">
                <div className="h-[400px] lg:h-[720px] rounded-lg overflow-hidden shadow-elegant border border-border/50">
                  <HotelsLeafletMap 
                    hotels={filteredHotels}
                    onHotelClick={(slug) => navigate(`/hotel/${slug}`)}
                  />
                </div>
              </div>
            </div>

            {/* View All Hotels Button */}
            <div className="text-center mt-8">
              <Link to="/hotels">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 transition-all"
                >
                  View All Hotels
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
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              WHY WIXOTEL
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Why Book Through Wixotel?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience seamless booking with unmatched benefits
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <Card className="border-border/50 bg-card hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Best Price Guarantee</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  We guarantee the lowest rates. Find a better price and we'll match it plus give you 10% off.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Instant Confirmation</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Get immediate booking confirmation and access to your reservation details 24/7.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Free Cancellation</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Flexible cancellation policies on most rooms. Plans change? No worries, we've got you covered.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Verified Reviews</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Read authentic reviews from real guests to make informed booking decisions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-accent/50 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-20 space-y-4 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              POWERFUL FEATURES
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
                className="group border-border/50 bg-gradient-to-br from-card to-card/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that best fits your hotel's needs
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-elegant' : 'border-border'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block mt-auto">
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-gradient-primary' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t bg-accent/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <span className="text-2xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
              <p className="text-sm text-muted-foreground mt-4">Modern hotel management for the digital age</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <a href="mailto:support@wixotel.com" className="block text-sm text-primary hover:underline">support@wixotel.com</a>
            </div>
          </div>
          <div className="border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">© 2025 WIXOTEL. All rights reserved. GDPR Compliant.</p>
          </div>
        </div>
      </footer>
      
      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <BookingLookup open={bookingLookupOpen} onOpenChange={setBookingLookupOpen} />
    </div>
  );
};

export default Landing;
