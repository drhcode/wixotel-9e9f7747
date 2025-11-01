import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Users, Monitor, Smartphone, Globe, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  avgViewsPerVisitor: number;
  topReferrers: { referrer: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  viewsByDay: { date: string; count: number }[];
}

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("7");

  useEffect(() => {
    fetchHotelId();
  }, []);

  useEffect(() => {
    if (hotelId) {
      fetchAnalytics();
    }
  }, [hotelId, dateRange]);

  const fetchHotelId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: hotelData } = await supabase
      .from('hotels')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (hotelData) {
      setHotelId(hotelData.id);
    }
  };

  const fetchAnalytics = async () => {
    if (!hotelId) return;

    try {
      setLoading(true);
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
        // Calculate summary statistics
        const totalViews = data.length;
        const uniqueVisitors = new Set(data.map(d => d.visitor_id)).size;
        const avgViewsPerVisitor = uniqueVisitors > 0 ? totalViews / uniqueVisitors : 0;

        // Top referrers
        const referrerCounts = data.reduce((acc: any, curr) => {
          const ref = curr.referrer || 'direct';
          acc[ref] = (acc[ref] || 0) + 1;
          return acc;
        }, {});
        const topReferrers = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({ referrer, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Device breakdown
        const deviceCounts = data.reduce((acc: any, curr) => {
          const device = curr.device_type || 'unknown';
          acc[device] = (acc[device] || 0) + 1;
          return acc;
        }, {});
        const deviceBreakdown = Object.entries(deviceCounts)
          .map(([device, count]) => ({ device, count: count as number }))
          .sort((a, b) => b.count - a.count);

        // Browser breakdown
        const browserCounts = data.reduce((acc: any, curr) => {
          const browser = curr.browser || 'unknown';
          acc[browser] = (acc[browser] || 0) + 1;
          return acc;
        }, {});
        const browserBreakdown = Object.entries(browserCounts)
          .map(([browser, count]) => ({ browser, count: count as number }))
          .sort((a, b) => b.count - a.count);

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
          topReferrers,
          deviceBreakdown,
          browserBreakdown,
          viewsByDay: viewsByDayArray,
        });
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, description }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Visitor Analytics</h2>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Visitor Analytics</h2>
          <p className="text-muted-foreground">Track your public page performance</p>
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
            <p className="text-muted-foreground">No analytics data available yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Page Views"
              value={analytics.totalViews.toLocaleString()}
              icon={Eye}
              description="Total visits to your page"
            />
            <StatCard
              title="Unique Visitors"
              value={analytics.uniqueVisitors.toLocaleString()}
              icon={Users}
              description="Individual visitors"
            />
            <StatCard
              title="Avg Views per Visitor"
              value={analytics.avgViewsPerVisitor.toFixed(1)}
              icon={TrendingUp}
              description="Engagement rate"
            />
            <StatCard
              title="Top Device"
              value={analytics.deviceBreakdown[0]?.device || 'N/A'}
              icon={Monitor}
              description={`${analytics.deviceBreakdown[0]?.count || 0} views`}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="referrers">Traffic Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Views by Day</CardTitle>
                    <CardDescription>Daily page views trend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.viewsByDay.map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm">{day.date}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 bg-primary rounded" 
                              style={{ 
                                width: `${(day.count / Math.max(...analytics.viewsByDay.map(d => d.count))) * 100}px` 
                              }}
                            />
                            <span className="text-sm font-medium w-12 text-right">{day.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Browser Usage</CardTitle>
                    <CardDescription>Most used browsers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.browserBreakdown.map((browser) => (
                        <div key={browser.browser} className="flex items-center justify-between">
                          <span className="text-sm">{browser.browser}</span>
                          <Badge variant="secondary">{browser.count} views</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="devices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Device Breakdown
                  </CardTitle>
                  <CardDescription>How visitors access your page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.deviceBreakdown.map((device) => {
                      const percentage = ((device.count / analytics.totalViews) * 100).toFixed(1);
                      return (
                        <div key={device.device} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{device.device}</span>
                            <span className="text-sm text-muted-foreground">
                              {device.count} views ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrers" className="space-y-4">
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
                      <p className="text-sm text-muted-foreground">No referrer data yet</p>
                    ) : (
                      analytics.topReferrers.map((referrer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {referrer.referrer === 'direct' ? 'Direct / Bookmark' : referrer.referrer}
                            </p>
                          </div>
                          <Badge>{referrer.count} visits</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
