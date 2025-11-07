import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hotel, Building2, DollarSign, TrendingUp, Check, X, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "./superadmin/SuperAdminSidebar";
import HotelManagement from "./superadmin/HotelManagement";
import SubscriptionsManagement from "./superadmin/SubscriptionsManagement";
import AllReservations from "./superadmin/AllReservations";
import AllGuests from "./superadmin/AllGuests";
import SubscriptionPlansManagement from "./superadmin/SubscriptionPlansManagement";
import InvoicesManagement from "./superadmin/InvoicesManagement";
import SmtpSettings from "./superadmin/SmtpSettings";
import { SupportTickets } from "./superadmin/SupportTickets";
import ReviewsManagement from "./superadmin/ReviewsManagement";
import EarningsManager from "./superadmin/EarningsManager";
import CancellationRequests from "./superadmin/CancellationRequests";
import { SuperAdminSettings } from "./superadmin/SuperAdminSettings";

interface Hotel {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  status: string;
  subscription_plan: string;
  created_at: string;
  allow_data_clear: boolean;
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
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

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

  const toggleDataClearPermission = async (hotelId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ allow_data_clear: !currentValue })
        .eq('id', hotelId);

      if (error) throw error;

      toast.success(`Data clear permission ${!currentValue ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update permission");
      console.error(error);
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

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
                <CardTitle className="text-lg lg:text-xl">All Hotels</CardTitle>
                <CardDescription className="text-sm">Manage hotel registrations and subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Hotel Name</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">Address</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Contact</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">Plan</TableHead>
                        <TableHead className="whitespace-nowrap hidden xl:table-cell">Clear Data</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="font-medium whitespace-nowrap">{hotel.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{hotel.address}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <div>{hotel.email}</div>
                            <div className="text-muted-foreground">{hotel.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(hotel.status)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{getPlanBadge(hotel.subscription_plan)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={hotel.allow_data_clear}
                              onCheckedChange={() => toggleDataClearPermission(hotel.id, hotel.allow_data_clear)}
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {hotel.allow_data_clear ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 lg:gap-2">
                            {hotel.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-success hover:text-success h-8 w-8 p-0"
                                  onClick={() => updateHotelStatus(hotel.id, 'active')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
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
                                className="text-destructive hover:text-destructive text-xs whitespace-nowrap"
                                onClick={() => updateHotelStatus(hotel.id, 'suspended')}
                              >
                                Suspend
                              </Button>
                            )}
                            {hotel.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-success hover:text-success text-xs whitespace-nowrap"
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
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "hotels":
        return <HotelManagement key={refreshKey} />;
      case "earnings":
        return <EarningsManager key={refreshKey} />;
      case "plans":
        return <SubscriptionPlansManagement key={refreshKey} />;
      case "subscriptions":
        return <SubscriptionsManagement key={refreshKey} />;
      case "invoices":
        return <InvoicesManagement key={refreshKey} />;
      case "reservations":
        return <AllReservations key={refreshKey} />;
      case "guests":
        return <AllGuests key={refreshKey} />;
      case "cancellations":
        return <CancellationRequests key={refreshKey} />;
      case "support":
        return <SupportTickets key={refreshKey} />;
      case "reviews":
        return <ReviewsManagement key={refreshKey} />;
      case "smtp":
        return <SmtpSettings key={refreshKey} />;
      case "settings":
        return <SuperAdminSettings key={refreshKey} />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <SuperAdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-40">
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 lg:gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <Hotel className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                    <span className="text-lg lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      HotelManager
                    </span>
                    <Badge variant="secondary" className="ml-1 lg:ml-2 text-xs">Super Admin</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>

            {/* Desktop Navigation Menu */}
            <div className="hidden lg:block border-t">
              <div className="flex px-4 py-2 gap-1 items-center">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "hotels", label: "Hotels" },
                  { id: "earnings", label: "Earnings" },
                  { id: "plans", label: "Plans" },
                  { id: "subscriptions", label: "Subscriptions" },
                  { id: "reservations", label: "Reservations" },
                  { id: "guests", label: "Guests" },
                  { id: "cancellations", label: "Cancellations" },
                  { id: "support", label: "Support" },
                  { id: "reviews", label: "Reviews" },
                  { id: "smtp", label: "Email Settings" },
                  { id: "settings", label: "Settings" },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="whitespace-nowrap"
                  >
                    {tab.label}
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
                {["overview", "hotels", "earnings", "plans", "subscriptions", "reservations", "guests", "cancellations", "support", "reviews", "smtp", "settings"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                    className="capitalize whitespace-nowrap text-xs"
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8">
              <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Platform Overview</h1>
                <p className="text-sm lg:text-base text-muted-foreground">Manage hotels, subscriptions, and monitor platform performance</p>
              </div>

              <div className="space-y-4 lg:space-y-6">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SuperAdminDashboard;
