import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  eachDayOfInterval,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const { data, error } = await supabase
      .from("bookings")
      .select("*, rooms(name, room_number), guests(name)")
      .eq("hotel_id", hotelId)
      .gte("check_out", format(start, "yyyy-MM-dd"))
      .lte("check_in", format(end, "yyyy-MM-dd"));

    if (error) {
      toast.error("Failed to load bookings");
      setIsLoading(false);
      return;
    }
    setBookings(data || []);
    setIsLoading(false);
  };

  const getBookingsForDate = (date: Date) => {
    const d = format(startOfDay(date), "yyyy-MM-dd");
    return bookings.filter((booking) => {
      const checkIn = format(startOfDay(new Date(booking.check_in)), "yyyy-MM-dd");
      const checkOut = format(startOfDay(new Date(booking.check_out)), "yyyy-MM-dd");
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

  const generateTimelineDates = (days: number = 12) => {
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(addDays(timelineStartDate, i));
    }
    return dates;
  };

  const timelineDates = generateTimelineDates();

  const fullMonthDates = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStartCellBookingForRoom = (roomId: string, date: Date) => {
    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue;
      const bStart = startOfDay(new Date(booking.check_in));
      const bEnd = startOfDay(new Date(booking.check_out));
      const windowStart = startOfDay(timelineStartDate);
      const windowEnd = startOfDay(addDays(timelineStartDate, 11));

      const overlaps = bStart <= windowEnd && bEnd >= windowStart;
      if (!overlaps) continue;

      if (isSameDay(date, bStart) || (bStart < windowStart && isSameDay(date, windowStart))) {
        return booking;
      }
    }
    return null;
  };

  const getBookingPosition = (booking: any, date: Date) => {
    const checkIn = startOfDay(new Date(booking.check_in));
    const checkOut = startOfDay(new Date(booking.check_out));
    const windowStart = startOfDay(timelineStartDate);
    const windowEnd = startOfDay(addDays(timelineStartDate, 11));

    const startCell = new Date(Math.max(checkIn.getTime(), windowStart.getTime()));
    if (!isSameDay(date, startCell)) return { start: false };

    const endCell = new Date(Math.min(checkOut.getTime(), windowEnd.getTime()));
    const span = differenceInDays(endCell, startCell) + 1;

    return {
      start: true,
      span,
      leftPercent: 50 / span,
      rightPercent: 50 / span,
    };
  };

  if (isLoading && bookings.length === 0 && rooms.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reservation Calendar</h2>
          <p className="text-muted-foreground text-sm">Manage your hotel bookings</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> New Reservation
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

          <div className="overflow-x-auto border rounded-lg">
            <div className="min-w-[1200px]">
              {/* Header */}
              <div className="grid relative" style={{ gridTemplateColumns: "300px repeat(12, 1fr)" }}>
                <div className="p-4 border-b border-r font-bold text-lg bg-muted sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  Room
                </div>
                {timelineDates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={`p-3 border-b border-r text-center ${
                      isSameDay(date, new Date()) ? "bg-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="text-xs font-semibold">{format(date, "EEE")}</div>
                    <div className="text-sm">{format(date, "dd")}</div>
                    <div className="text-xs text-muted-foreground">{format(date, "MMM")}</div>
                  </div>
                ))}
              </div>

              {/* Rooms */}
              {rooms.map((room) => {
                const renderedIndices = new Set<number>();
                return (
                  <div key={room.id} className="grid relative" style={{ gridTemplateColumns: "300px repeat(12, 1fr)" }}>
                    <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="text-sm font-bold">
                        {room.room_number} {room.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">Room</div>
                    </div>

                    {timelineDates.map((date, idx) => {
                      if (renderedIndices.has(idx)) return null;
                      const booking = getStartCellBookingForRoom(room.id, date);
                      if (booking) {
                        const pos = getBookingPosition(booking, date);
                        for (let i = 0; i < pos.span; i++) renderedIndices.add(idx + i);

                        const gridStart = 2 + idx;
                        const gridEnd = 2 + idx + pos.span;

                        return (
                          <div
                            key={date.toISOString()}
                            className="border-b border-r min-h-[80px] bg-background p-2 relative"
                            style={{ gridColumnStart: gridStart, gridColumnEnd: gridEnd }}
                          >
                            <div
                              className="absolute text-xs cursor-pointer hover:opacity-90 transition-all flex flex-col justify-center px-3 py-2 shadow-sm rounded-lg"
                              style={{
                                backgroundColor: `${getStatusColor(booking.status)}20`,
                                border: `2px solid ${getStatusColor(booking.status)}`,
                                color: getStatusColor(booking.status),
                                top: "8px",
                                bottom: "8px",
                                left: `${pos.leftPercent}%`,
                                right: `${pos.rightPercent}%`,
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
                        renderedIndices.add(idx);
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

          {/* Full Month Scroll */}
          <div className="overflow-x-auto mt-2 border-t">
            <div className="flex min-w-[calc(80px*30)]">
              {fullMonthDates.map((date) => (
                <div key={date.toISOString()} className="w-20 text-center border-r p-1 text-xs">
                  {format(date, "dd MMM")}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile & Modals omitted for brevity, keep your existing mobile code */}
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
