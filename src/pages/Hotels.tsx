import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, MapPin, Star, Navigation, Search, Menu } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BookingLookup } from "@/components/BookingLookup";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  is_verified: boolean;
  is_featured: boolean;
  avgRating?: number;
  reviewCount?: number;
}

const HOTELS_PER_PAGE = 8;

const Hotels = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<PublicHotel[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingLookupOpen, setBookingLookupOpen] = useState(false);

  useEffect(() => {
    fetchHotels();
    getUserLocation();
  }, []);

  useEffect(() => {
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
    const countries = hotels
      .filter(h => h.country)
      .map(h => h.country as string)
      .filter((country, index, self) => self.indexOf(country) === index)
      .sort();
    setAvailableCountries(countries);
  }, [selectedCountry, selectedCity, hotels, searchQuery]);

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotels')
      .select('id, name, slug, address, city, country, description, images, about_us_image, latitude, longitude, is_verified, is_featured')
      .eq('status', 'active')
      .eq('show_on_landing', true);
    
    if (data) {
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
              avgRating: Math.round(avgRating * 10) / 10,
              reviewCount: reviews.length,
            };
          }
          
          return hotel;
        })
      );
      
      setHotels(hotelsWithReviews);
      setFilteredHotels(hotelsWithReviews);
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

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
        },
        (error) => {
          console.log("Location access denied", error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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

    if (searchQuery) {
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.country?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter(h => h.country?.trim() === selectedCountry.trim());
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter(h => h.city?.trim() === selectedCity.trim());
    }

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
    setCurrentPage(1);
  };

  const sortByLocation = () => {
    getUserLocation();
  };

  const clearFilters = () => {
    setSelectedCountry("all");
    setSelectedCity("all");
    setSearchQuery("");
  };

  const totalPages = Math.ceil(filteredHotels.length / HOTELS_PER_PAGE);
  const startIndex = (currentPage - 1) * HOTELS_PER_PAGE;
  const endIndex = startIndex + HOTELS_PER_PAGE;
  const currentHotels = filteredHotels.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      <BookingLookup 
        open={bookingLookupOpen} 
        onOpenChange={setBookingLookupOpen}
      />

      {/* Header */}
      <section className="pt-32 pb-16 px-4 md:px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              DISCOVER HOTELS
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Find Your Perfect Stay</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore {hotels.length} premium hotels powered by Wixotel
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by hotel name, city, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

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

              {(selectedCountry !== "all" || selectedCity !== "all" || searchQuery) && (
                <Button 
                  variant="ghost" 
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hotels Grid with Map */}
      <section className="py-16 px-4 md:px-6">
        <div className="container mx-auto">
          {currentHotels.length > 0 ? (
            <>
              <div className="mb-8">
                <p className="text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredHotels.length)} of {filteredHotels.length} hotels
                </p>
              </div>

              <div className="grid lg:grid-cols-[1fr,600px] gap-8">
                {/* Hotels List - 2 per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                {currentHotels.map((hotel) => (
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

                {/* Map - Visible on all devices, sticky on desktop */}
                <div className="w-full">
                  <div className="h-[400px] lg:h-[calc(100vh-200px)] lg:sticky lg:top-24 rounded-lg overflow-hidden shadow-elegant border border-border/50">
                    <HotelsLeafletMap 
                      hotels={filteredHotels}
                      onHotelClick={(slug) => navigate(`/hotel/${slug}`)}
                    />
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Hotel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hotels found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or search query</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t bg-accent/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
              </Link>
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
    </div>
  );
};

export default Hotels;
