import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Wallet, Building2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Earning {
  id: string;
  hotel_id: string;
  lead_id: string | null;
  booking_id: string | null;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  hotels: {
    name: string;
  };
}

interface Stats {
  totalEarnings: number;
  pendingEarnings: number;
  completedEarnings: number;
  totalBookings: number;
}

const EarningsManager = () => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchHotels();
    fetchEarnings();
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [selectedHotel, selectedMonth, selectedStatus]);

  const fetchHotels = async () => {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setHotels(data || []);
    } catch (error: any) {
      console.error("Failed to load hotels:", error);
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("earnings")
        .select(`
          *,
          hotels:hotel_id (name)
        `)
        .not('lead_id', 'is', null); // Only show earnings from leads (not manual reservations)

      // Apply hotel filter
      if (selectedHotel !== "all") {
        query = query.eq("hotel_id", selectedHotel);
      }

      // Apply status filter
      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      // Apply month filter
      if (selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        query = query.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setEarnings(data || []);

      // Calculate stats
      const totalEarnings = data?.reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      const pendingEarnings = data?.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      const completedEarnings = data?.filter(e => e.status === 'completed').reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      
      setStats({
        totalEarnings,
        pendingEarnings,
        completedEarnings,
        totalBookings: data?.length || 0,
      });
    } catch (error: any) {
      toast.error("Failed to load earnings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const clearFilters = () => {
    setSelectedHotel("all");
    setSelectedMonth("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = selectedHotel !== "all" || selectedMonth !== "all" || selectedStatus !== "all";

  // Generate month options (last 12 months)
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading earnings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hotel</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Hotels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hotels</SelectItem>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {generateMonthOptions().map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">8% commission from bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">€{stats.pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Wallet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">€{stats.completedEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Commission tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl">Commission Breakdown</CardTitle>
          <CardDescription className="text-sm">
            8% commission from lead-based bookings only (manual reservations excluded)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Hotel</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Booking Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Commission Rate</TableHead>
                  <TableHead className="whitespace-nowrap">Commission</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No earnings data yet. Earnings will appear when guests submit booking requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {earning.hotels?.name || "Unknown Hotel"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(earning.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        €{Number(earning.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {earning.commission_rate}%
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap text-primary">
                        €{Number(earning.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsManager;
