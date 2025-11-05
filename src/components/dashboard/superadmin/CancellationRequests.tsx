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
    check_in: string;
    check_out: string;
  } | null;
  hotels: {
    name: string;
  } | null;
}

const CancellationRequests = () => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select(`
          *,
          bookings(confirmation_number, full_name, check_in, check_out),
          hotels(name)
        `)
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

  const handleApprove = async (requestId: string, bookingId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('cancellation_requests')
        .update({ 
          status: 'approved',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Delete the booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (deleteError) throw deleteError;

      toast.success("Cancellation request approved and booking deleted");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to approve cancellation request");
      console.error(error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Cancellation request rejected");
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
            <CardTitle>Cancellation Requests</CardTitle>
            <CardDescription>Review and manage booking cancellation requests from hotels</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No cancellation requests found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
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
                    <TableCell className="font-medium">{request.hotels?.name || 'N/A'}</TableCell>
                    <TableCell>{request.bookings?.full_name || 'N/A'}</TableCell>
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
                            onClick={() => handleApprove(request.id, request.booking_id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleReject(request.id)}
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

export default CancellationRequests;
