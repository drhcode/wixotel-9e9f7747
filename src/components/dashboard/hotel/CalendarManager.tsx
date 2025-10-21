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
  isBefore,
  isAfter,
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
  };

  const fetchBookings = async () => {
    setIsLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const timelineEnd = addDays(timelineStartDate, 13);

    const orQuery =
      `and(check_in.gte.${format(start, "yyyy-MM-dd")},check_in.lte.${format(end, "yyyy-MM-dd")}),` +
      `and(check_out.gte.${format(start, "yyyy-MM-dd")},check_out.lte.${format(end, "yyyy-MM-dd")}),` +
      `and(check_in.lte.${format(start, "yyyy-MM-dd")},check_out.gte.${format(end, "yyyy-MM-dd")}),` +
      `and(check_in.lte.${format(timelineEnd, "yyyy-MM-dd")},check_out.gte.${format(timelineStartDate, "yyyy-MM-dd")})`;

    const { data, error } = await supabase
      .from("bookings")
      .select("*, rooms(name, room_number), guests(name)")
      .eq("hotel_id", hotelId)
      .or(orQuery);

    if (error) {
      toast.error("Failed to load bookings");
      setIsLoading(false);
      return;
    }

    setBookings(data || []);
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#7C3BED";
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

  // 🔹 New half-cell logic
  const getBookingPosition = (booking: any, date: Date) => {
    const checkIn = startOfDay(new Date(booking.check_in));
    const checkOut = startOfDay(new Date(booking.check_out));
    const windowStart = startOfDay(timelineStartDate);
    const windowEnd = startOfDay(addDays(timelineStartDate, 13));

    if (isAfter(checkIn, windowEnd) || isBefore(checkOut, windowStart)) return null;

    const startCell = isBefore(checkIn, windowStart) ? windowStart : checkIn;
    const endCell = isAfter(checkOut, windowEnd) ? windowEnd : checkOut;

    const spanDays = differenceInDays(endCell, startCell) + 1;

    const leftOffsetPercent = checkIn < windowStart ? 0 : 25; // half-cell start
    const rightOffsetPercent = checkOut > windowEnd ? 0 : 25; // half-cell end

    return {
      startCell,
      spanDays,
      leftOffsetPercent,
      rightOffsetPercent,
    };
  };

  const getStartCellBookingForRoom = (roomId: string, date: Date) => {
    const lastVisibleDate = startOfDay(addDays(timelineStartDate, 13));
    const windowStart = startOfDay(timelineStartDate);
    const dateStr = format(startOfDay(date), "yyyy-MM-dd");

    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue;

      const bStart = startOfDay(new Date(booking.check_in));
      const bEnd = startOfDay(new Date(booking.check_out));

      const overlaps = bStart.getTime() <= lastVisibleDate.getTime() && bEnd.getTime() >= windowStart.getTime();
      if (!overlaps) continue;

      const startCellDate = new Date(Math.max(bStart.getTime(), windowStart.getTime()));
      const startCellStr = format(startCellDate, "yyyy-MM-dd");

      if (startCellStr === dateStr) {
        return booking;
      }
    }

    return null;
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

      {/* Header */}
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

      {/* Desktop Timeline */}
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
              {/* Header */}
              <div className="grid relative" style={{ gridTemplateColumns: "300px repeat(14, 1fr)" }}>
                <div className="p-4 border-b border-r font-bold text-lg bg-muted sticky left-0 z-20">Room</div>
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

              {/* Rows */}
              {rooms.map((room) => {
                const renderedDateIndices = new Set<number>();

                return (
                  <div key={room.id} className="grid relative" style={{ gridTemplateColumns: "300px repeat(14, 1fr)" }}>
                    <div className="p-4 border-b border-r bg-background sticky left-0 z-10">
                      <div className="text-sm font-bold">
                        {room.room_number} {room.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Room</div>
                    </div>

                    {timelineDates.map((date, dateIndex) => {
                      if (renderedDateIndices.has(dateIndex)) return null;

                      const startBooking = getStartCellBookingForRoom(room.id, date);
                      if (startBooking) {
                        const position = getBookingPosition(startBooking, date);
                        if (!position) return null;

                        for (let i = 0; i < position.spanDays; i++) {
                          renderedDateIndices.add(dateIndex + i);
                        }

                        const gridStart = 2 + dateIndex;
                        const gridEnd = 2 + dateIndex + position.spanDays;

                        return (
                          <div
                            key={date.toISOString()}
                            className="border-b border-r min-h-[80px] relative bg-background"
                            style={{ gridColumnStart: gridStart, gridColumnEnd: gridEnd }}
                          >
                            <div
                              className="absolute h-7 flex items-center justify-center px-3 text-xs font-medium rounded-full shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                              style={{
                                backgroundColor: `${getStatusColor(startBooking.status)}20`,
                                border: `2px solid ${getStatusColor(startBooking.status)}`,
                                color: getStatusColor(startBooking.status),
                                left: `${position.leftOffsetPercent}%`,
                                right: `${position.rightOffsetPercent}%`,
                                top: "calc(50% - 0.875rem)",
                              }}
                              onClick={() => setSelectedBooking(startBooking)}
                            >
                              <span className="truncate">{startBooking.guests?.name || startBooking.guest_name}</span>
                            </div>
                          </div>
                        );
                      } else {
                        renderedDateIndices.add(dateIndex);
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

      {/* Booking modals */}
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
