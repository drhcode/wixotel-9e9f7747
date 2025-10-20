import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import HotelOverview from "./hotel/HotelOverview";
import RoomsManager from "./hotel/RoomsManager";
import BookingsManager from "./hotel/BookingsManager";
import GuestsManager from "./hotel/GuestsManager";
import CalendarManager from "./hotel/CalendarManager";

interface HotelData {
  id: string;
  name: string;
  status: string;
  subscription_plan: string;
}

const HotelAdminDashboard = () => {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotelData();
  }, []);

  const fetchHotelData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: hotelData, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel className="h-8 w-8 text-primary" />
              <div>
                <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {hotel.name}
                </span>
                <p className="text-xs text-muted-foreground">Hotel Dashboard</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HotelOverview hotelId={hotel.id} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarManager hotelId={hotel.id} />
          </TabsContent>

          <TabsContent value="rooms">
            <RoomsManager hotelId={hotel.id} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsManager hotelId={hotel.id} />
          </TabsContent>

          <TabsContent value="guests">
            <GuestsManager hotelId={hotel.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HotelAdminDashboard;
