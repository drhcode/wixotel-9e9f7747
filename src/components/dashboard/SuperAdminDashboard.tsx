import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, Building2, DollarSign, TrendingUp, Check, X, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ImportCSV from "./hotel/ImportCSV";
import HotelManagement from "./superadmin/HotelManagement";
import SubscriptionsManagement from "./superadmin/SubscriptionsManagement";
import AllReservations from "./superadmin/AllReservations";
import AllGuests from "./superadmin/AllGuests";
import SubscriptionPlansManagement from "./superadmin/SubscriptionPlansManagement";

interface Hotel {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  status: string;
  subscription_plan: string;
  created_at: string;
}

interface Stats {
  totalHotels: number;
  activeHotels: number;
  pendingHotels: number;
  totalRevenue: number;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [stats, setStats] = useState<Stats>({ totalHotels: 0, activeHotels: 0, pendingHotels: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: hotelsData, error: hotelsError } = await supabase
        .from('hotels')
        .select('*')
        .order('created_at', { ascending: false });

      if (hotelsError) throw hotelsError;

      setHotels(hotelsData || []);
      
      // Calculate stats
      const totalHotels = hotelsData?.length || 0;
      const activeHotels = hotelsData?.filter(h => h.status === 'active').length || 0;
      const pendingHotels = hotelsData?.filter(h => h.status === 'pending').length || 0;

      setStats({
        totalHotels,
        activeHotels,
        pendingHotels,
        totalRevenue: activeHotels * 99 // Mock revenue calculation
      });
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateHotelStatus = async (hotelId: string, status: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ status })
        .eq('id', hotelId);

      if (error) throw error;

      toast.success(`Hotel ${status === 'active' ? 'approved' : 'suspended'} successfully`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update hotel status");
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      pending: "secondary",
      suspended: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      basic: "bg-blue-100 text-blue-800",
      pro: "bg-purple-100 text-purple-800",
      premium: "bg-amber-100 text-amber-800"
    };
    return <Badge className={colors[plan] || ""}>{plan}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                HotelManager
              </span>
              <Badge variant="secondary" className="ml-2">Super Admin</Badge>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
          <p className="text-muted-foreground">Manage hotels, subscriptions, and monitor platform performance</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Hotels</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalHotels}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered on platform</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Hotels</CardTitle>
                  <Hotel className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">{stats.activeHotels}</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently operational</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <TrendingUp className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">{stats.pendingHotels}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">€{stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">From subscriptions</p>
                </CardContent>
              </Card>
            </div>

            {/* Hotels Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Hotels</CardTitle>
                <CardDescription>Manage hotel registrations and subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="font-medium">{hotel.name}</TableCell>
                        <TableCell>{hotel.address}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{hotel.email}</div>
                            <div className="text-muted-foreground">{hotel.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(hotel.status)}</TableCell>
                        <TableCell>{getPlanBadge(hotel.subscription_plan)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hotel.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-success hover:text-success"
                                  onClick={() => updateHotelStatus(hotel.id, 'active')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => updateHotelStatus(hotel.id, 'suspended')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {hotel.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => updateHotelStatus(hotel.id, 'suspended')}
                              >
                                Suspend
                              </Button>
                            )}
                            {hotel.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-success hover:text-success"
                                onClick={() => updateHotelStatus(hotel.id, 'active')}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hotels">
            <HotelManagement />
          </TabsContent>

          <TabsContent value="plans">
            <SubscriptionPlansManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsManagement />
          </TabsContent>

          <TabsContent value="reservations">
            <AllReservations />
          </TabsContent>

          <TabsContent value="guests">
            <AllGuests />
          </TabsContent>

          <TabsContent value="import">
            <ImportCSV hotelId="" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
