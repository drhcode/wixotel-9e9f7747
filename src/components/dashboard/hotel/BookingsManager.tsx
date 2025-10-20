import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

interface Props {
  hotelId: string;
}

const BookingsManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    fetchBookings();
  }, [hotelId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, rooms(name)')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.guest_name?.toLowerCase().includes(searchLower) ||
      booking.guest_email?.toLowerCase().includes(searchLower) ||
      booking.rooms?.name?.toLowerCase().includes(searchLower) ||
      booking.status?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'checked_in':
        return 'secondary';
      case 'checked_out':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDeleteAttempt = (bookingId: string) => {
    setDeletingBooking(bookingId);
    setDeletePassword("");
  };

  const handleDelete = async () => {
    if (!deletingBooking) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('deletion_password')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.deletion_password) {
        toast.error("Please set up a deletion password in Settings first");
        setDeletingBooking(null);
        return;
      }

      if (profile.deletion_password !== deletePassword) {
        toast.error("Incorrect password");
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', deletingBooking);

      if (error) throw error;

      toast.success("Booking deleted successfully");
      setDeletingBooking(null);
      setDeletePassword("");
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to delete booking");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Bookings Management</h2>
        <p className="text-muted-foreground">View and manage all bookings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest, room, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No bookings found" : "No bookings yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.guest_name}</TableCell>
                    <TableCell>{booking.rooms?.name}</TableCell>
                    <TableCell>{new Date(booking.check_in).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(booking.check_out).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${booking.total_amount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttempt(booking.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingBooking} onOpenChange={() => setDeletingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your deletion password to confirm this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="delete-password">Deletion Password</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your deletion password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletingBooking(null);
              setDeletePassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingsManager;
