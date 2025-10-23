import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import BookingDetailsModal from "../hotel/BookingDetailsModal";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AllReservations = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const exportToCSV = () => {
    const headers = ['Hotel', 'Guest Name', 'Email', 'Phone', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status', 'Payment', 'Notes'];
    const csvData = filteredBookings.map(booking => [
      booking.hotels?.name || '',
      booking.guests?.name || booking.guest_name || '',
      booking.guest_email || booking.guests?.email || '',
      booking.guest_phone || booking.guests?.phone || '',
      `Room ${booking.rooms?.room_number || booking.rooms?.name || ''}`,
      format(new Date(booking.check_in), 'MMM dd, yyyy'),
      format(new Date(booking.check_out), 'MMM dd, yyyy'),
      `€${booking.total_amount}`,
      booking.status,
      booking.payment_status,
      booking.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reserved': return '#7C3BED';
      case 'pending': return '#7C3BED';
      case 'checked_in': return '#16A249';
      case 'checked_out': return '#C06969';
      case 'cancelled': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">All Reservations</h2>
          <p className="text-muted-foreground">View and search all bookings across hotels · Total: {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={filteredBookings.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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
              {paginatedBookings.map((booking) => (
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
        {filteredBookings.length > 0 && (
          <div className="px-6 pb-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* First page */}
                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(1)}
                      isActive={currentPage === 1}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis after first page */}
                {currentPage > 3 && totalPages > 5 && (
                  <PaginationItem>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                )}
                
                {/* Middle pages */}
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  const showPage = page > 1 && page < totalPages && 
                    Math.abs(page - currentPage) <= 1;
                  
                  if (!showPage) return null;
                  
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {/* Ellipsis before last page */}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <PaginationItem>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                )}
                
                {/* Last page */}
                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(totalPages)}
                      isActive={currentPage === totalPages}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
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
