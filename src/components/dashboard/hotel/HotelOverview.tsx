import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Calendar, Users, DollarSign } from "lucide-react";

interface Props {
  hotelId: string;
}

const HotelOverview = ({ hotelId }: Props) => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    totalGuests: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchStats();
  }, [hotelId]);

  const fetchStats = async () => {
    try {
      // Fetch rooms count
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId);

      // Fetch bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId);

      // Fetch guests count
      const { count: guestsCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId);

      // Fetch total revenue from bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('hotel_id', hotelId)
        .eq('payment_status', 'completed');

      const totalRevenue = bookingsData?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

      setStats({
        totalRooms: roomsCount || 0,
        totalBookings: bookingsCount || 0,
        totalGuests: guestsCount || 0,
        totalRevenue
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Quick stats and insights for your hotel</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRooms}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for booking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">€{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From completed bookings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <h3 className="font-medium">Add Your Rooms</h3>
              <p className="text-sm text-muted-foreground">Set up your rooms with details, pricing, and availability</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <h3 className="font-medium">Manage Bookings</h3>
              <p className="text-sm text-muted-foreground">Create and track bookings with an intuitive calendar view</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <h3 className="font-medium">Track Guests</h3>
              <p className="text-sm text-muted-foreground">Maintain guest records and preferences for better service</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotelOverview;
