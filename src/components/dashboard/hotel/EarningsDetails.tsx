import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, TrendingUp, CheckCircle2, Clock, Euro } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";

interface Earning {
  id: string;
  lead_id: string | null;
  booking_id: string | null;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  leads?: {
    full_name: string;
    email: string;
    check_in: string;
    check_out: string;
  } | null;
  bookings?: {
    full_name: string;
    guest_email: string;
    check_in: string;
    check_out: string;
  } | null;
}

interface Props {
  hotelId: string;
}

const EarningsDetails = ({ hotelId }: Props) => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);

  useEffect(() => {
    fetchEarnings();
  }, [hotelId]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("earnings")
        .select(`
          *,
          leads:lead_id (full_name, email, check_in, check_out),
          bookings:booking_id (full_name, guest_email, check_in, check_out)
        `)
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEarnings(data || []);

      // Calculate monthly total (current month, completed only)
      const monthStart = startOfMonth(new Date());
      const monthly = data?.filter(e => 
        e.status === 'completed' && 
        new Date(e.created_at) >= monthStart
      ).reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      setMonthlyTotal(monthly);

      // Calculate completed total (all time)
      const completed = data?.filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      setCompletedTotal(completed);

      // Calculate pending total
      const pending = data?.filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      setPendingTotal(pending);

    } catch (error: any) {
      toast.error("Failed to load earnings details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      completed: { variant: "default", icon: CheckCircle2 },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading earnings details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-warning" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">€{monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'MMMM yyyy')} commission
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/50 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">€{completedTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time earnings</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">€{pendingTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting check-out</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Commission Details
          </CardTitle>
          <CardDescription>
            8% commission from accepted booking requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Booking Amount</TableHead>
                    <TableHead>Commission (8%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground font-medium">No commission earnings yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Commission will be applied when guests submit booking requests from your public page
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    earnings.map((earning) => {
                      const guestData = earning.leads || earning.bookings;
                      const guestName = guestData?.full_name || "Unknown";
                      const guestEmail = earning.leads?.email || earning.bookings?.guest_email || "-";
                      
                      return (
                        <TableRow key={earning.id}>
                          <TableCell className="font-medium">{guestName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{guestEmail}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {guestData?.check_in ? format(new Date(guestData.check_in), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {guestData?.check_out ? format(new Date(guestData.check_out), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            €{Number(earning.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-warning">
                            €{Number(earning.commission_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(earning.status)}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {format(new Date(earning.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {earnings.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-start gap-3">
                <Euro className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Commission Policy</p>
                  <p className="text-muted-foreground">
                    • Commission is applied only to booking requests submitted through your public page
                  </p>
                  <p className="text-muted-foreground">
                    • Status changes to <strong>"completed"</strong> when guests check out
                  </p>
                  <p className="text-muted-foreground">
                    • Manual reservations created from your dashboard are <strong>commission-free</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsDetails;
