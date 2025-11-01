import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, LogOut, AlertCircle, Menu } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HotelSidebar } from "./hotel/HotelSidebar";
import HotelOverview from "./hotel/HotelOverview";
import RoomsManager from "./hotel/RoomsManager";
import BookingsManager from "./hotel/BookingsManager";
import GuestsManager from "./hotel/GuestsManager";
import CalendarManager from "./hotel/CalendarManager";
import ProfileSettings from "./hotel/ProfileSettings";
import LeadsManager from "./hotel/LeadsManager";

interface HotelData {
  id: string;
  name: string;
  status: string;
  subscription_plan: string;
  logo_url: string | null;
}

const HotelAdminDashboard = () => {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");

  useEffect(() => {
    fetchHotelData();
  }, []);

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

      if (error) throw error;
      setHotel(hotelData);
    } catch (error: any) {
      toast.error("Failed to load hotel data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
              <div className="flex items-center gap-2">
                <Hotel className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  HotelManager
                </span>
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
              <div className="flex items-center gap-2">
                <Hotel className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  HotelManager
                </span>
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
        return <HotelOverview hotelId={hotel.id} />;
      case "calendar":
        return <CalendarManager hotelId={hotel.id} />;
      case "rooms":
        return <RoomsManager hotelId={hotel.id} />;
      case "bookings":
        return <BookingsManager hotelId={hotel.id} />;
      case "guests":
        return <GuestsManager hotelId={hotel.id} />;
      case "leads":
        return <LeadsManager hotelId={hotel.id} />;
      case "settings":
        return <ProfileSettings />;
      default:
        return <HotelOverview hotelId={hotel.id} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <HotelSidebar activeTab={activeTab} onTabChange={setActiveTab} />

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
                  {hotel.logo_url ? (
                    <img 
                      src={hotel.logo_url} 
                      alt={`${hotel.name} logo`}
                      className="h-10 w-10 object-contain rounded-lg"
                    />
                  ) : (
                    <Hotel className="h-7 w-7 text-primary" />
                  )}
                  <div>
                    <span className="text-xl lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {hotel.name}
                    </span>
                    <p className="text-xs text-muted-foreground hidden sm:block">Hotel Dashboard</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden border-t overflow-x-auto">
              <div className="flex px-2 py-2 gap-1 min-w-max">
                {["overview", "calendar", "rooms", "bookings", "guests", "leads", "settings"].map((tab) => (
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
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HotelAdminDashboard;
