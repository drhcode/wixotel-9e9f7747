import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Calendar, Users, TrendingUp, Shield, Zap, MapPin, Navigation } from "lucide-react";
import { DemoModal } from "@/components/DemoModal";
import heroImage from "@/assets/hotel-hero.jpg";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LazyHotelsMap = lazy(() => import("@/components/HotelsMap").then(m => ({ default: m.HotelsMap })));


interface PublicHotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string | null;
  country: string | null;
  description: string | null;
  logo_url: string | null;
  images: string[] | null;
  about_us_image: string | null;
  latitude: number | null;
  longitude: number | null;
}

const Landing = () => {
  const navigate = useNavigate();
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<PublicHotel[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
      .from('hotels')
      .select('id, name, slug, address, city, country, description, logo_url, images, about_us_image, latitude, longitude')
      .eq('status', 'active')
      .eq('show_on_landing', true);
    
    if (data) {
      setHotels(data);
      setFilteredHotels(data); // Initialize filtered hotels
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.address) {
        const country = data.address.country;
        const city = data.address.city || data.address.town || data.address.village;
        
        if (country) {
          setSelectedCountry(country);
        }
        if (city) {
          setTimeout(() => setSelectedCity(city), 100);
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

  const plans = [
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel className="h-8 w-8 text-primary" />
              <span className="text-3xl font-playfair font-bold bg-gradient-primary bg-clip-text text-transparent">Wixotel</span>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="https://wa.me/355682041518" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-primary">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-sm font-medium">+355682041518</span>
              </a>
              <Link to="/auth">
                <Button className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105">
                  Login to Panel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
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
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-105">
                    Start Free Trial
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
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
        <section className="py-24 px-6 bg-gradient-to-b from-background to-accent/30">
          <div className="container mx-auto">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
                DISCOVER HOTELS
              </div>
              <h2 className="text-5xl font-bold tracking-tight">Find Your Perfect Stay</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Explore our collection of premium hotels powered by Wixotel
              </p>
            </div>

            {/* Split View: Filters/Hotels + Map */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Side: Filters and Hotels */}
              <div className="flex flex-col gap-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
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

                {/* Hotels List */}
                <div className="space-y-4 overflow-y-auto max-h-[700px] pr-2">
                  {filteredHotels.map((hotel) => (
                    <Link key={hotel.id} to={`/hotel/${hotel.slug}`}>
                      <Card className="group overflow-hidden border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
                        <div className="flex gap-4">
                          <div className="w-32 h-32 relative overflow-hidden bg-accent flex-shrink-0">
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
                            ) : hotel.logo_url ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <img 
                                  src={hotel.logo_url} 
                                  alt={hotel.name}
                                  className="max-w-[70%] max-h-[70%] object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Hotel className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 p-4">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors mb-2">{hotel.name}</CardTitle>
                            <CardDescription className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{hotel.city && hotel.country ? `${hotel.city}, ${hotel.country}` : hotel.address}</span>
                            </CardDescription>
                            {hotel.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{hotel.description}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}

                  {filteredHotels.length === 0 && (
                    <div className="text-center py-12">
                      <Hotel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-xl text-muted-foreground">No hotels found with the selected filters</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Map */}
              <div className="h-[700px] rounded-lg overflow-hidden border border-border/50 shadow-lg">
                <Suspense fallback={<div className="h-full w-full" />}> 
                  <LazyHotelsMap 
                    hotels={filteredHotels} 
                    onHotelClick={(slug) => navigate(`/hotel/${slug}`)}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background via-accent/50 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-20 space-y-4 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              POWERFUL FEATURES
            </div>
            <h2 className="text-5xl font-bold tracking-tight">Everything You Need to Succeed</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Enterprise-grade tools designed to transform your hotel operations and accelerate growth
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that best fits your hotel's needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-hero">
        <div className="container mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Hotel Management?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of hotels already using WIXOTEL to streamline operations and boost revenue
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="shadow-lg hover:scale-105 transition-transform">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-playfair font-bold text-foreground">Wixotel</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 WIXOTEL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
