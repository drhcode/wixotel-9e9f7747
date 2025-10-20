import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addDays, startOfDay, differenceInDays, isSameDay } from "date-fns";
import BookingModal from "./BookingModal";
import BookingDetailsModal from "./BookingDetailsModal";
import { Badge } from "@/components/ui/badge";

interface Props {
  hotelId: string;
}

const CalendarManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchBookings();
    fetchRooms();
  }, [hotelId, currentMonth, timelineStartDate]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('room_number');
    
    if (error) {
      toast.error("Failed to load rooms");
      return;
    }
    setRooms(data || []);
  };

  const fetchBookings = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const timelineEnd = addDays(timelineStartDate, 14);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(name, room_number), guests(name)')
      .eq('hotel_id', hotelId)
      .or(`and(check_in.gte.${format(start, 'yyyy-MM-dd')},check_in.lte.${format(end, 'yyyy-MM-dd')}),and(check_out.gte.${format(start, 'yyyy-MM-dd')},check_out.lte.${format(end, 'yyyy-MM-dd')}),and(check_in.lte.${format(start, 'yyyy-MM-dd')},check_out.gte.${format(end, 'yyyy-MM-dd')}),and(check_in.gte.${format(timelineStartDate, 'yyyy-MM-dd')},check_in.lte.${format(timelineEnd, 'yyyy-MM-dd')}),and(check_out.gte.${format(timelineStartDate, 'yyyy-MM-dd')},check_out.lte.${format(timelineEnd, 'yyyy-MM-dd')}),and(check_in.lte.${format(timelineStartDate, 'yyyy-MM-dd')},check_out.gte.${format(timelineEnd, 'yyyy-MM-dd')})`);
    
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
      case 'confirmed': return '#7C3BED';
      case 'pending': return '#7C3BED';
      case 'checked_in': return '#16A249';
      case 'checked_out': return '#C06969';
      case 'cancelled': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getBookingsForRoom = (roomId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => 
      booking.room_id === roomId &&
      dateStr >= booking.check_in && 
      dateStr < booking.check_out // Changed to < so check-out day is not occupied
    );
  };

  const getStartCellBookingForRoom = (roomId: string, date: Date) => {
    const lastVisibleDate = addDays(timelineStartDate, 13);
    const dateStr = format(date, 'yyyy-MM-dd');

    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue;
      // Check overlap with current 14-day window (inclusive of checkout day for visual continuity)
      const overlaps =
        booking.check_in <= format(lastVisibleDate, 'yyyy-MM-dd') &&
        booking.check_out >= format(timelineStartDate, 'yyyy-MM-dd');
      if (!overlaps) continue;

      // Start cell is the later of check_in and window start
      const startCellDate = new Date(
        Math.max(new Date(booking.check_in).getTime(), startOfDay(timelineStartDate).getTime())
      );
      const startCellStr = format(startCellDate, 'yyyy-MM-dd');
      if (startCellStr === dateStr) {
        return booking;
      }
    }

    return null;
  };

  const generateTimelineDates = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(timelineStartDate, i));
    }
    return dates;
  };

  const timelineDates = generateTimelineDates();

  const getBookingPosition = (booking: any, date: Date) => {
    const checkIn = startOfDay(new Date(booking.check_in));
    const checkOut = startOfDay(new Date(booking.check_out));
    const currentDate = startOfDay(date);
    const windowStart = startOfDay(timelineStartDate);
    const lastVisibleDate = startOfDay(addDays(timelineStartDate, 13));

    // Start cell for this booking within current window
    const startCell = new Date(Math.max(checkIn.getTime(), windowStart.getTime()));

    if (isSameDay(startCell, currentDate)) {
      // End cell within current window (inclusive for "middle to middle")
      const endCell = new Date(Math.min(checkOut.getTime(), lastVisibleDate.getTime()));
      const span = differenceInDays(endCell, startCell) + 1;

      // Check if this is the actual check-in date (not just window start)
      const isActualCheckIn = isSameDay(checkIn, currentDate);
      // Check if the end date is the actual check-out date (not just window end)
      const isActualCheckOut = isSameDay(checkOut, endCell);

      return {
        start: true,
        span: Math.max(1, span),
        isActualCheckIn,
        isActualCheckOut
      };
    }
    return { start: false, span: 0, isActualCheckIn: false, isActualCheckOut: false };
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
          <p className="text-muted-foreground text-sm">Manage your hotel bookings</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Desktop Timeline View */}
      <div className="hidden lg:block">
        <Card className="p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              Timeline View
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTimelineStartDate(addDays(timelineStartDate, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTimelineStartDate(new Date())}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTimelineStartDate(addDays(timelineStartDate, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto relative rounded-lg border">
            <div className="min-w-[1200px] bg-background">
              {/* Header */}
              <div className="grid relative" style={{ gridTemplateColumns: '300px repeat(14, 1fr)' }}>
                <div className="p-4 border-b border-r font-bold text-lg bg-muted sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  Room
                </div>
                {timelineDates.map(date => {
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div 
                      key={date.toISOString()} 
                      className={`p-3 border-b border-r text-center ${
                        isToday 
                          ? 'bg-primary/20' 
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className={`text-xs ${isToday ? 'text-primary' : 'font-semibold'}`}>
                        {format(date, 'EEE')}
                      </div>
                      <div className={`text-sm ${isToday ? 'text-primary' : ''}`}>
                        {format(date, 'dd')}
                      </div>
                      <div className={`text-xs ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(date, 'MMM')}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Room Rows */}
              {rooms.map(room => {
                const renderedDateIndices = new Set<number>();
                
                return (
                  <div key={room.id} className="grid relative" style={{ gridTemplateColumns: '300px repeat(14, 1fr)' }}>
                    <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="text-sm font-bold">{room.room_number} {room.name}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">
                        Room
                      </div>
                    </div>
                    {timelineDates.map((date, dateIndex) => {
                      // Skip if this date was already rendered as part of a span
                      if (renderedDateIndices.has(dateIndex)) {
                        return null;
                      }

                      const startBooking = getStartCellBookingForRoom(room.id, date);
                      
                      if (startBooking) {
                        const position = getBookingPosition(startBooking, date);
                        
                        // Mark the spanned dates as rendered
                        for (let i = 0; i < position.span; i++) {
                          renderedDateIndices.add(dateIndex + i);
                        }
                        
                        return (
                          <div 
                            key={date.toISOString()} 
                            className="border-b border-r min-h-[80px] bg-background relative"
                            style={{ gridColumnStart: 2 + dateIndex, gridColumnEnd: Math.min(2 + dateIndex + position.span, 16) }}
                          >
                            <div 
                              className="absolute top-2 bottom-2 text-xs cursor-pointer hover:opacity-90 transition-all flex flex-col justify-center px-3 py-2 shadow-sm rounded-lg"
                              style={{ 
                                left: position.isActualCheckIn ? '50%' : '0',
                                right: position.isActualCheckOut ? '50%' : '0',
                                backgroundColor: `${getStatusColor(startBooking.status)}20`,
                                border: `2px solid ${getStatusColor(startBooking.status)}`,
                                color: getStatusColor(startBooking.status),
                              }}
                              onClick={() => setSelectedBooking(startBooking)}
                            >
                              <div className="font-semibold truncate">
                                {startBooking.guests?.name || startBooking.guest_name}
                              </div>
                              <div className="text-[10px] opacity-90 truncate">
                                {format(new Date(startBooking.check_in), 'MMM dd')} - {format(new Date(startBooking.check_out), 'MMM dd')}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        renderedDateIndices.add(dateIndex);
                        return (
                          <div key={date.toISOString()} className="border-b border-r min-h-[80px] bg-background hover:bg-accent/30 transition-colors" />
                        );
                      }
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile Calendar View */}
      <div className="lg:hidden space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
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
                    <Badge style={{ backgroundColor: getStatusColor(booking.status) }} className="text-white">
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(booking.check_in), 'MMM dd')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm font-medium mt-2">
                    €{booking.total_amount}
                  </div>
                </Card>
              ))
            )}
          </div>
          </Card>
        </div>

        <div className="flex items-center justify-center py-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            Reserved Rooms ({selectedDateBookings.length}) | Free Rooms ({rooms.length - selectedDateBookings.length})
          </span>
        </div>
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
