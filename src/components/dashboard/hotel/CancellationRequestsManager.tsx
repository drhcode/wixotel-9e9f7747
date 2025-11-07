import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CancellationRequest {
  id: string;
  booking_id: string;
  hotel_id: string;
  requested_by: string;
  status: string;
  reason: string | null;
  created_at: string;
  bookings: {
    confirmation_number: string;
    full_name: string;
    guest_email: string;
    check_in: string;
    check_out: string;
  } | null;
}

interface Props {
  hotelId: string;
}

const CancellationRequestsManager = ({ hotelId }: Props) => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`cancellation-requests-${hotelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cancellation_requests',
          filter: `hotel_id=eq.${hotelId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select(`
          *,
          bookings(confirmation_number, full_name, guest_email, check_in, check_out)
        `)
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error("Failed to load cancellation requests");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: CancellationRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update request status
      const { error: updateError } = await supabase
        .from('cancellation_requests')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id 
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', request.booking_id);

      if (bookingError) throw bookingError;

      // Send approval email
      if (request.bookings?.guest_email) {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotelId,
            recipient_email: request.bookings.guest_email,
            subject: 'Cancellation Request Approved',
            html_content: `
              <h2>Cancellation Approved</h2>
              <p>Dear ${request.bookings.full_name},</p>
              <p>Your cancellation request has been approved.</p>
              <p><strong>Booking Details:</strong></p>
              <ul>
                <li><strong>Confirmation #:</strong> ${request.bookings.confirmation_number}</li>
                <li><strong>Check-in:</strong> ${format(new Date(request.bookings.check_in), 'MMM dd, yyyy')}</li>
                <li><strong>Check-out:</strong> ${format(new Date(request.bookings.check_out), 'MMM dd, yyyy')}</li>
              </ul>
              <p>Your booking has been cancelled. If you paid a deposit, a refund will be processed according to our cancellation policy.</p>
              <p>Best regards</p>
            `,
            email_type: 'cancellation_approved'
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
        }
      }

      toast.success("Cancellation request approved and guest notified");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to approve cancellation request");
      console.error(error);
    }
  };

  const handleReject = async (request: CancellationRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('cancellation_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id 
        })
        .eq('id', request.id);

      if (error) throw error;

      // Send rejection email
      if (request.bookings?.guest_email) {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotelId,
            recipient_email: request.bookings.guest_email,
            subject: 'Cancellation Request Update',
            html_content: `
              <h2>Cancellation Request Update</h2>
              <p>Dear ${request.bookings.full_name},</p>
              <p>We regret to inform you that your cancellation request cannot be approved at this time.</p>
              <p><strong>Booking Details:</strong></p>
              <ul>
                <li><strong>Confirmation #:</strong> ${request.bookings.confirmation_number}</li>
                <li><strong>Check-in:</strong> ${format(new Date(request.bookings.check_in), 'MMM dd, yyyy')}</li>
                <li><strong>Check-out:</strong> ${format(new Date(request.bookings.check_out), 'MMM dd, yyyy')}</li>
              </ul>
              <p>Your booking remains active. If you have questions, please contact us directly.</p>
              <p>Best regards</p>
            `,
            email_type: 'cancellation_rejected'
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
        }
      }

      toast.success("Cancellation request rejected and guest notified");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to reject cancellation request");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Requests</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Cancellation Requests
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount} pending</Badge>
              )}
            </CardTitle>
            <CardDescription>Review and manage booking cancellation requests</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No cancellation requests</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Confirmation #</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.bookings?.full_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {request.bookings?.confirmation_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {request.bookings?.check_in ? format(new Date(request.bookings.check_in), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {request.bookings?.check_out ? format(new Date(request.bookings.check_out), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || 'No reason provided'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-success hover:text-success"
                            onClick={() => handleApprove(request)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleReject(request)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CancellationRequestsManager;
