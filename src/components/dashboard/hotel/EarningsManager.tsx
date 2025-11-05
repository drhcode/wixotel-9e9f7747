import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, TrendingUp, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface Earning {
  id: string;
  total_amount: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  bookings: {
    full_name: string;
    check_in: string;
    check_out: string;
  } | null;
  leads: {
    full_name: string;
  } | null;
}

interface Stats {
  totalEarnings: number;
  platformCommission: number;
  pendingCommission: number;
  completedCommission: number;
  totalBookings: number;
}

interface EarningsManagerProps {
  hotelId: string;
}

type SortField = 'created_at' | 'total_amount' | 'commission_amount' | 'status';
type SortDirection = 'asc' | 'desc';

const EarningsManager = ({ hotelId }: EarningsManagerProps) => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    platformCommission: 0,
    pendingCommission: 0,
    completedCommission: 0,
    totalBookings: 0,
  });
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchEarnings();
  }, [hotelId, sortField, sortDirection]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("earnings")
        .select(`
          *,
          bookings(full_name, check_in, check_out),
          leads(full_name)
        `)
        .eq("hotel_id", hotelId)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;

      const earningsData = data || [];
      setEarnings(earningsData);

      // Calculate stats
      const totalEarnings = earningsData.reduce((sum, e) => sum + Number(e.total_amount), 0);
      const platformCommission = earningsData.reduce((sum, e) => sum + Number(e.commission_amount), 0);
      const pendingCommission = earningsData
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0);
      const completedCommission = earningsData
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0);

      setStats({
        totalEarnings,
        platformCommission,
        pendingCommission,
        completedCommission,
        totalBookings: earningsData.length,
      });
    } catch (error: any) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalBookings} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Commission (8%)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.platformCommission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total commission charged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commission</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.pendingCommission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting checkout completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Commission</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.completedCommission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From checked-out guests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
          <CardDescription>
            Detailed view of all earnings and platform commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No earnings data yet. Earnings will appear when leads are accepted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSort('created_at')}
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Stay Period</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSort('total_amount')}
                      >
                        Total Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSort('commission_amount')}
                      >
                        Commission (8%)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => {
                    const guestName = earning.bookings?.full_name || earning.leads?.full_name || 'N/A';
                    const netAmount = Number(earning.total_amount) - Number(earning.commission_amount);
                    
                    return (
                      <TableRow key={earning.id}>
                        <TableCell className="font-medium">{guestName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(earning.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {earning.bookings ? (
                            <>
                              {format(new Date(earning.bookings.check_in), "MMM dd")} - {format(new Date(earning.bookings.check_out), "MMM dd, yyyy")}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          €{Number(earning.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          -€{Number(earning.commission_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          €{netAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(earning.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsManager;
