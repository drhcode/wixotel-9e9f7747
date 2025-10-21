import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addDays,
  startOfDay,
  differenceInDays,
  isSameDay,
  min,
  max,
} from "date-fns";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, [hotelId, currentMonth, timelineStartDate]);

  const fetchRooms = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("rooms").select("*").eq("hotel_id", hotelId).order("room_number");

    if (error) {
      toast.error("Failed to load rooms");
      setIsLoading(false);
      return;
    }
    setRooms(data || []);
    setIsLoading(false);
  };

  const fetchBookings = async () => {
    setIsLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const timelineEnd = addDays(timelineStartDate, 13);

    // Fetch bookings that intersect the current month OR the timeline
    const { data, error } = await supabase
      .from("bookings")
      .select("*, rooms(name, room_number), guests(name)")
      .eq("hotel_id", hotelId)
      .or(
        `and(check_in.lte.${format(end, "yyyy-MM-dd")},check_out.gte.${format(
          start,
          "yyyy-MM-dd",
        )}),and(check_in.lte.${format(timelineEnd, "yyyy-MM-dd")},check_out.gte.${format(
          timelineStartDate,
          "yyyy-MM-dd",
        )})`,
      );

    if (error) {
      toast.error("Failed to load bookings");
      setIsLoading(false);
      return;
    }
    setBookings(data || []);
    setIsLoading(false);
  };

  const getBookingsForDate = (date: Date) => {
    const d = startOfDay(date).getTime();
    return bookings.filter((b) => {
      const checkIn = startOfDay(new Date(b.check_in)).getTime();
      const checkOut = startOfDay(new Date(b.check_out)).getTime();
      return d >= checkIn && d < checkOut;
    });
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "pending":
        return "#7C3BED";
      case "checked_in":
        return "#16A249";
      case "checked_out":
        return "#C06969";
      case "cancelled":
        return "hsl(var(--destructive))";
      default:
        return "hsl(var(--muted))";
    }
  };

  const generateTimelineDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(timelineStartDate, i));
    }
    return dates;
  };

  const timelineDates = generateTimelineDates();

  const getBookingsForRoomInTimeline = (roomId: string) => {
    return bookings
      .filter(
        (b) =>
          b.room_id === roomId &&
          new Date(b.check_out) > timelineStartDate &&
          new Date(b.check_in) <= addDays(timelineStartDate, 13),
      )
      .map((b) => {
        const start = max([timelineStartDate, startOfDay(new Date(b.check_in))]);
        const end = min([addDays(timelineStartDate, 13), startOfDay(new Date(b.check_out))]);
        const span = differenceInDays(end, start);
        return { ...b, start, end, span };
      });
  };

  const modifiers = {
    booked: bookings
      .map((b) => {
        const dates: Date[] = [];
        let current = startOfDay(new Date(b.check_in));
        const end = startOfDay(new Date(b.check_out));
        while (current < end) {
          dates.push(new Date(current));
          current = addDays(current, 1);
        }
        return dates;
      })
      .flat(),
  };

  const modifiersStyles = {
    booked: {
      backgroundColor: "hsl(var(--primary) / 0.1)",
      color: "hsl(var(--primary))",
      fontWeight: "bold",
    },
  };

  if (isLoading && bookings.length === 0 && rooms.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading calendar data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Updating...</p>
          </div>
        </div>
      )}

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
            <h3 className="font-semibold text-lg">Timeline View</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTimelineStartDate(addDays(timelineStartDate, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTimelineStartDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTimelineStartDate(addDays(timelineStartDate, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto relative rounded-lg border">
            <div className="min-w-[1200px] bg-background">
              <div className="grid relative" style={{ gridTemplateColumns: "300px repeat(14, 1fr)" }}>
                <div className="p-4 border-b border-r font-bold text-lg bg-muted sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  Room
                </div>
                {timelineDates.map((date) => {
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-3 border-b border-r text-center ${isToday ? "bg-primary/20" : "bg-muted/30"}`}
                    >
                      <div className={`text-xs ${isToday ? "text-primary" : "font-semibold"}`}>
                        {format(date, "EEE")}
                      </div>
                      <div className={`text-sm ${isToday ? "text-primary" : ""}`}>{format(date, "dd")}</div>
                      <div className={`text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {format(date, "MMM")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {rooms.map((room) => {
                const roomBookings = getBookingsForRoomInTimeline(room.id);
                return (
                  <div key={room.id} className="grid relative" style={{ gridTemplateColumns: "300px repeat(14, 1fr)" }}>
                    <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="text-sm font-bold">
                        {room.room_number} {room.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">Room</div>
                    </div>

                    {timelineDates.map((date, dateIndex) => {
                      const booking = roomBookings.find((b) => isSameDay(b.start, date));
                      if (booking) {
                        return (
                          <div
                            key={date.toISOString()}
                            className="border-b border-r min-h-[80px] bg-background p-2 relative"
                            style={{
                              gridColumnStart: 2 + dateIndex,
                              gridColumnEnd: 2 + dateIndex + booking.span,
                            }}
                          >
                            <div
                              className="absolute text-xs cursor-pointer hover:opacity-90 transition-all flex flex-col justify-center px-3 py-2 shadow-sm rounded-lg"
                              style={{
                                backgroundColor: `${getStatusColor(booking.status)}20`,
                                border: `2px solid ${getStatusColor(booking.status)}`,
                                color: getStatusColor(booking.status),
                                top: "8px",
                                bottom: "8px",
                                left: 0,
                                right: 0,
                              }}
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <div className="font-semibold truncate">{booking.guests?.name || booking.guest_name}</div>
                              <div className="text-[10px] opacity-90 truncate">
                                {format(new Date(booking.check_in), "MMM dd")} -{" "}
                                {format(new Date(booking.check_out), "MMM dd")}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={date.toISOString()} className="border-b border-r min-h-[80px] bg-background" />
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
            className="w-full max-w-full"
          />
        </Card>

        <div className="flex items-center justify-center py-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            Reserved Rooms ({selectedDateBookings.length}) | Free Rooms ({rooms.length - selectedDateBookings.length})
          </span>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-4">Bookings for {format(selectedDate, "MMM dd, yyyy")}</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {selectedDateBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No bookings for this date</p>
            ) : (
              selectedDateBookings.map((booking) => (
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
                    {format(new Date(booking.check_in), "MMM dd")} -{" "}
                    {format(new Date(booking.check_out), "MMM dd, yyyy")}
                  </div>
                  <div className="text-sm font-medium mt-2">€{booking.total_amount}</div>
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
