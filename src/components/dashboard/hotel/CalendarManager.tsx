import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import BookingModal from "./BookingModal";
import BookingDetailsModal from "./BookingDetailsModal";
import { Badge } from "@/components/ui/badge";

interface Props {
  hotelId: string;
}

const CalendarManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    fetchBookings();
  }, [hotelId, currentMonth]);

  const fetchBookings = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(name, room_number), guests(name)')
      .eq('hotel_id', hotelId)
      .gte('check_in', format(start, 'yyyy-MM-dd'))
      .lte('check_out', format(end, 'yyyy-MM-dd'));
    
    if (error) {
      toast.error("Failed to load bookings");
      return;
    }
    setBookings(data || []);
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => {
      const checkIn = booking.check_in;
      const checkOut = booking.check_out;
      return dateStr >= checkIn && dateStr <= checkOut;
    });
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'checked_in': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'checked_out': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const modifiers = {
    booked: bookings.map(b => {
      const dates = [];
      let current = new Date(b.check_in);
      const end = new Date(b.check_out);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }).flat()
  };

  const modifiersStyles = {
    booked: {
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      color: 'hsl(var(--primary))',
      fontWeight: 'bold'
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reservation Calendar</h2>
          <p className="text-muted-foreground text-sm">Select a date to view bookings</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Calendar Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="w-full"
          />
        </Card>

        {/* Bookings List Section */}
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-4">
            Bookings for {format(selectedDate, 'MMM dd, yyyy')}
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {selectedDateBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No bookings for this date
              </p>
            ) : (
              selectedDateBookings.map(booking => (
                <Card 
                  key={booking.id} 
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{booking.guests?.name || booking.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {booking.rooms?.room_number || booking.rooms?.name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(booking.check_in), 'MMM dd')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm font-medium mt-2">
                    ${booking.total_amount}
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hotelId={hotelId}
        prefilledDates={null}
        prefilledRoomId={null}
        onSuccess={fetchBookings}
      />

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

export default CalendarManager;
