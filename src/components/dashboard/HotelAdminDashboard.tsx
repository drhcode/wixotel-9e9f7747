import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, AlertCircle, Menu, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "./hotel/NotificationDropdown";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HotelSidebar } from "./hotel/HotelSidebar";
const HotelOverview = lazy(() => import("./hotel/HotelOverview"));
const RoomsManager = lazy(() => import("./hotel/RoomsManager"));
const BookingsManager = lazy(() => import("./hotel/BookingsManager"));
const GuestsManager = lazy(() => import("./hotel/GuestsManager"));
const CalendarManager = lazy(() => import("./hotel/CalendarManager"));
const ProfileSettings = lazy(() => import("./hotel/ProfileSettings"));
const InvoicesViewer = lazy(() => import("./hotel/InvoicesViewer"));
const LeadsManager = lazy(() => import("./hotel/LeadsManager"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SupportManager = lazy(() => import("./hotel/SupportManager"));
const LazyEarningsManager = lazy(() => import("./hotel/EarningsManager"));
const ICalManager = lazy(() => import("./hotel/ICalManager").then(m => ({ default: m.ICalManager })));
const ConflictsManager = lazy(() => import("./hotel/ConflictsManager"));

interface HotelData {
  id: string;
  name: string;
  status: string;
  subscription_plan: string;
  logo_url: string | null;
  slug: string | null;
}

const HotelAdminDashboard = () => {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState(0);

  // Read section from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section) {
      setActiveTab(section);
    }
  }, []);

  useEffect(() => {
    fetchHotelData();
  }, []);

  useEffect(() => {
    if (hotel?.id) {
      fetchLeadsCount();
      fetchUnpaidInvoicesCount();
      
      // Subscribe to leads changes
      const leadsChannel = supabase
        .channel(`leads-count-horizontal-${hotel.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads',
            filter: `hotel_id=eq.${hotel.id}`,
          },
          () => {
            // Small delay to ensure database update is complete
            setTimeout(() => {
              fetchLeadsCount();
            }, 100);
          }
        )
        .subscribe();

      // Subscribe to invoices changes
      const invoicesChannel = supabase
        .channel(`invoices-count-horizontal-${hotel.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `hotel_id=eq.${hotel.id}`,
          },
          () => {
            setTimeout(() => {
              fetchUnpaidInvoicesCount();
            }, 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(invoicesChannel);
      };
    }
  }, [hotel?.id]);

  const fetchHotelData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: hotelData, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error && (error as any).code !== 'PGRST116') {
        throw error;
      }
      
      setHotel(hotelData);
    } catch (error: any) {
      toast.error("Failed to load hotel data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsCount = async () => {
    if (!hotel?.id) return;
    
    try {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotel.id)
        .eq("is_read", false)
        .neq("status", "lost")
        .neq("status", "converted");

      if (error) throw error;
      setLeadsCount(count || 0);
    } catch (error) {
      console.error("Error fetching leads count:", error);
    }
  };

  const fetchUnpaidInvoicesCount = async () => {
    if (!hotel?.id) return;
    
    try {
      const { count, error } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotel.id)
        .in("status", ["pending", "overdue"]);

      if (error) throw error;
      setUnpaidInvoicesCount(count || 0);
    } catch (error) {
      console.error("Error fetching unpaid invoices count:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Refreshing data...");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Hotel Found</AlertTitle>
          <AlertDescription>
            Please contact support to set up your hotel account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hotel.status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hotel.logo_url && (
                  <img 
                    src={hotel.logo_url} 
                    alt={hotel.name}
                    className="h-10 w-10 object-contain rounded-lg"
                  />
                )}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {hotel.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground -mt-0.5">by wixotel</span>
                </div>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-20">
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold">Pending Approval</h1>
            <p className="text-muted-foreground">
              Your hotel registration is pending approval. Our team will review your application and activate your account within 24 hours.
            </p>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hotel Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hotel Name:</span>
                  <span className="font-medium">{hotel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-warning font-medium">Pending</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (hotel.status === 'suspended') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hotel.logo_url && (
                  <img 
                    src={hotel.logo_url} 
                    alt={hotel.name}
                    className="h-10 w-10 object-contain rounded-lg"
                  />
                )}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {hotel.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground -mt-0.5">by wixotel</span>
                </div>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-20">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Suspended</AlertTitle>
            <AlertDescription>
              Your hotel account has been suspended. Please contact support for more information.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <HotelOverview key={refreshKey} hotelId={hotel.id} />;
      case "calendar":
        return <CalendarManager key={refreshKey} hotelId={hotel.id} />;
      case "ical":
        return <ICalManager key={refreshKey} hotelId={hotel.id} />;
      case "conflicts":
        return <ConflictsManager key={refreshKey} hotelId={hotel.id} />;
      case "rooms":
        return <RoomsManager key={refreshKey} hotelId={hotel.id} />;
      case "bookings":
        return <BookingsManager key={refreshKey} hotelId={hotel.id} />;
      case "guests":
        return <GuestsManager key={refreshKey} hotelId={hotel.id} />;
      case "leads":
        return <LeadsManager key={refreshKey} hotelId={hotel.id} />;
      case "earnings":
        return <LazyEarningsManager key={refreshKey} hotelId={hotel.id} />;
      case "invoices":
        return <InvoicesViewer key={refreshKey} />;
      case "support":
        return <SupportManager key={refreshKey} hotelId={hotel.id} />;
      case "notifications":
        return <Notifications key={refreshKey} />;
      case "settings":
        return <ProfileSettings key={refreshKey} />;
      default:
        return <HotelOverview key={refreshKey} hotelId={hotel.id} />;
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen w-full flex bg-background">
        <HotelSidebar activeTab={activeTab} onTabChange={setActiveTab} hotelId={hotel.id} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-40">
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger>
                    <Menu className="h-5 w-5" />
                  </SidebarTrigger>
                  {hotel.logo_url && (
                    <img 
                      src={hotel.logo_url} 
                      alt={hotel.name}
                      className="h-10 w-10 object-contain rounded-lg"
                    />
                  )}
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {hotel.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground -mt-0.5">by wixotel</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hotel.slug && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(`/hotel/${hotel.slug}`, '_blank')}
                      title="View public page"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Public Page</span>
                    </Button>
                  )}
                  <NotificationDropdown hotelId={hotel.id} />
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Menu */}
            <div className="hidden lg:block border-t">
              <div className="flex px-4 py-2 gap-1 items-center overflow-x-auto">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "notifications", label: "Notifications" },
                  { id: "calendar", label: "Calendar" },
                  { id: "ical", label: "Sync" },
                  { id: "conflicts", label: "Conflicts" },
                  { id: "rooms", label: "Rooms" },
                  { id: "bookings", label: "Bookings" },
                  { id: "guests", label: "Guests" },
                  { id: "leads", label: "Leads" },
                  { id: "earnings", label: "Earnings" },
                  { id: "invoices", label: "Invoices" },
                  { id: "support", label: "Support" },
                  { id: "settings", label: "Settings" },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="whitespace-nowrap relative"
                  >
                    {tab.label}
                    {tab.id === "leads" && leadsCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {leadsCount}
                      </Badge>
                    )}
                    {tab.id === "invoices" && unpaidInvoicesCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unpaidInvoicesCount}
                      </Badge>
                    )}
                  </Button>
                ))}
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    title="Refresh data"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden border-t overflow-x-auto">
              <div className="flex px-2 py-2 gap-1 min-w-max">
                {["overview", "notifications", "calendar", "ical", "conflicts", "rooms", "bookings", "guests", "leads", "earnings", "invoices", "support", "settings"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                    className="capitalize whitespace-nowrap"
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className={activeTab === "calendar" ? "" : "container mx-auto px-4 lg:px-6 py-6"}>
            <div className={activeTab === "calendar" ? "px-4 lg:px-6 py-6" : ""}>
              <Suspense fallback={<div className="py-10 text-center">Loading...</div>}>
                {renderContent()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HotelAdminDashboard;
