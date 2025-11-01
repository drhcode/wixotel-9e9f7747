import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Calendar, Users, Euro, Eye, Monitor, Globe, TrendingUp, Smartphone, BarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Props {
  hotelId: string;
}

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  avgViewsPerVisitor: number;
  deviceBreakdown: { device: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  viewsByDay: { date: string; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const HotelOverview = ({ hotelId }: Props) => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    totalGuests: 0,
    totalRevenue: 0
  });
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [dateRange, setDateRange] = useState<string>("30");

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [hotelId, dateRange]);

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

      // Fetch total revenue from checked out bookings only
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('hotel_id', hotelId)
        .eq('status', 'checked_out')
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

  const fetchAnalytics = async () => {
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const { data, error } = await supabase
        .from('page_analytics')
        .select('*')
        .eq('hotel_id', hotelId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      if (data) {
        const totalViews = data.length;
        const uniqueVisitors = new Set(data.map(d => d.visitor_id)).size;
        const avgViewsPerVisitor = uniqueVisitors > 0 ? totalViews / uniqueVisitors : 0;

        // Device breakdown
        const deviceCounts = data.reduce((acc: any, curr) => {
          const device = curr.device_type || 'unknown';
          acc[device] = (acc[device] || 0) + 1;
          return acc;
        }, {});
        const deviceBreakdown = Object.entries(deviceCounts)
          .map(([device, count]) => ({ device, count: count as number }))
          .sort((a, b) => b.count - a.count);

        // Top referrers
        const referrerCounts = data.reduce((acc: any, curr) => {
          const ref = curr.referrer || 'direct';
          acc[ref] = (acc[ref] || 0) + 1;
          return acc;
        }, {});
        const topReferrers = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({ referrer, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        // Views by day
        const viewsByDay = data.reduce((acc: any, curr) => {
          const date = format(new Date(curr.created_at), 'MMM dd');
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
        const viewsByDayArray = Object.entries(viewsByDay)
          .map(([date, count]) => ({ date, count: count as number }));

        setAnalytics({
          totalViews,
          uniqueVisitors,
          avgViewsPerVisitor,
          deviceBreakdown,
          topReferrers,
          viewsByDay: viewsByDayArray,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Quick stats and insights for your hotel</p>
      </div>

      {/* Main Stats */}
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
            <Euro className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">€{stats.totalRevenue.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">From checked out guests</p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Analytics Section - Always Visible */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Visitor Analytics
            </h3>
            <p className="text-sm text-muted-foreground">Public page performance insights</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!analytics ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No analytics data available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start sharing your public page to see visitor insights</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Analytics Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.uniqueVisitors.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Individual visitors</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Views/Visitor</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avgViewsPerVisitor.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Engagement rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Device</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{analytics.deviceBreakdown[0]?.device || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">{analytics.deviceBreakdown[0]?.count || 0} views</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Views Over Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Views Over Time
                  </CardTitle>
                  <CardDescription>Daily page views trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={analytics.viewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[8, 8, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Device Breakdown Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Device Breakdown
                  </CardTitle>
                  <CardDescription>Visitor device distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.deviceBreakdown}
                        dataKey="count"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ device, percent }) => `${device}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.deviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Traffic Sources
                </CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topReferrers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No referrer data yet</p>
                  ) : (
                    analytics.topReferrers.map((referrer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{index + 1}</span>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {referrer.referrer === 'direct' ? 'Direct / Bookmark' : referrer.referrer}
                          </p>
                        </div>
                        <Badge variant="secondary">{referrer.count} visits</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Getting Started Section */}
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
