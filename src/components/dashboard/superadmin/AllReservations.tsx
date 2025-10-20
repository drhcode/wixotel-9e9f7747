import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import BookingDetailsModal from "../hotel/BookingDetailsModal";

const AllReservations = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const filtered = bookings.filter(booking =>
      booking.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.hotels?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.rooms?.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBookings(filtered);
  }, [searchTerm, bookings]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        hotels(name),
        rooms(name, room_number),
        guests(name, email, phone)
      `)
      .order('created_at', { ascending: false });
    setBookings(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#7C3BED';
      case 'pending': return '#7C3BED';
      case 'checked_in': return '#16A249';
      case 'checked_out': return '#C06969';
      case 'cancelled': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Reservations</h2>
        <p className="text-muted-foreground">View and search all bookings across hotels</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, email, phone, hotel, or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow 
                  key={booking.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <TableCell className="font-medium">{booking.hotels?.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{booking.guests?.name || booking.guest_name}</div>
                      <div className="text-muted-foreground text-xs">
                        {booking.guest_email || booking.guests?.email}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {booking.guest_phone || booking.guests?.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    Room {booking.rooms?.room_number || booking.rooms?.name}
                  </TableCell>
                  <TableCell>{format(new Date(booking.check_in), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(booking.check_out), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>€{booking.total_amount}</TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: getStatusColor(booking.status) }} className="text-white">
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{booking.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {booking.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
};

export default AllReservations;
