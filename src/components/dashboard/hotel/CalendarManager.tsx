import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addDays, startOfDay, differenceInDays, isSameDay, min, max } from "date-fns";
import BookingModal from "./BookingModal";
import BookingDetailsModal from "./BookingDetailsModal";

interface Props {
  hotelId: string;
}

const CalendarManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(startOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  const DEFAULT_WINDOW_DAYS = 12;

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
    const start = startOfMonth(timelineStartDate);
    const end = endOfMonth(timelineStartDate);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, rooms(name, room_number), guests(name)")
      .eq("hotel_id", hotelId)
      .or(`and(check_in.lte.${format(end, "yyyy-MM-dd")},check_out.gte.${format(start, "yyyy-MM-dd")})`);

    if (error) {
      toast.error("Failed to load bookings");
      setIsLoading(false);
      return;
    }
    setBookings(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, [hotelId, timelineStartDate]);

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

  const generateFullMonthDates = () => {
    const start = startOfMonth(timelineStartDate);
    const end = endOfMonth(timelineStartDate);
    const dates: Date[] = [];
    let current = start;
    while (current <= end) {
      dates.push(current);
      current = addDays(current, 1);
    }
    return dates;
  };

  const generateTimelineWindowDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      dates.push(addDays(timelineStartDate, i));
    }
    return dates;
  };

  const fullMonthDates = generateFullMonthDates();
  const timelineDates = generateTimelineWindowDates();

  const getBookingsForRoom = (roomId: string) => {
    return bookings
      .filter(
        (b) =>
          b.room_id === roomId &&
          new Date(b.check_out) >= timelineStartDate &&
          new Date(b.check_in) <= endOfMonth(timelineStartDate),
      )
      .map((b) => {
        const start = max([timelineStartDate, startOfDay(new Date(b.check_in))]);
        const end = min([endOfMonth(timelineStartDate), startOfDay(new Date(b.check_out))]);
        const span = differenceInDays(end, start);
        return { ...b, start, end, span };
      });
  };

  if (isLoading && bookings.length === 0 && rooms.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reservation Calendar</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Reservation
        </Button>
      </div>

      {/* Timeline Navigation */}
      <div className="flex items-center gap-2 mb-2">
        <Button size="icon" onClick={() => setTimelineStartDate(addDays(timelineStartDate, -DEFAULT_WINDOW_DAYS))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={() => setTimelineStartDate(startOfDay(new Date()))}>
          Today
        </Button>
        <Button size="icon" onClick={() => setTimelineStartDate(addDays(timelineStartDate, DEFAULT_WINDOW_DAYS))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          Window: {format(timelineDates[0], "MMM dd")} - {format(timelineDates[timelineDates.length - 1], "MMM dd")}
        </span>
      </div>

      {/* Timeline Table */}
      <div className="overflow-x-auto border rounded-lg">
        <div className="min-w-[1200px]">
          {/* Header Row */}
          <div className="grid" style={{ gridTemplateColumns: "300px repeat(auto-fill, minmax(80px,1fr))" }}>
            <div className="p-4 border-b border-r font-bold bg-muted sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
              Room
            </div>
            {fullMonthDates.map((date) => (
              <div key={date.toISOString()} className="p-2 border-b border-r text-center sticky top-0 bg-muted z-10">
                <div className="text-xs font-semibold">{format(date, "EEE")}</div>
                <div className="text-sm font-bold">{format(date, "dd")}</div>
                <div className="text-xs">{format(date, "MMM")}</div>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {rooms.map((room) => {
              const roomBookings = getBookingsForRoom(room.id);
              const rendered = new Set<number>();

              return (
                <div
                  key={room.id}
                  className="grid relative"
                  style={{ gridTemplateColumns: "300px repeat(auto-fill, minmax(80px,1fr))" }}
                >
                  {/* Room Column */}
                  <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="font-bold">
                      {room.room_number} {room.name}
                    </div>
                  </div>

                  {/* Timeline Window Cells */}
                  {timelineDates.map((date, idx) => {
                    if (rendered.has(idx)) return null;

                    // Booking block
                    const booking = roomBookings.find((b) => isSameDay(b.start, date));
                    if (booking) {
                      for (let i = 0; i <= booking.span; i++) rendered.add(idx + i);

                      return (
                        <div
                          key={date.toISOString()}
                          className="border-b border-r min-h-[80px] bg-background p-2 relative"
                          style={{ gridColumnStart: 2 + idx, gridColumnEnd: 2 + idx + booking.span + 1 }}
                        >
                          <div
                            className="absolute text-xs cursor-pointer hover:opacity-90 transition-all flex flex-col justify-center px-3 py-2 shadow-sm rounded-lg"
                            style={{
                              backgroundColor: `${getStatusColor(booking.status)}20`,
                              border: `2px solid ${getStatusColor(booking.status)}`,
                              color: getStatusColor(booking.status),
                              top: "8px",
                              bottom: "8px",
                              left: "25%",
                              right: "25%",
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
                    }

                    return <div key={date.toISOString()} className="border-b border-r min-h-[80px] bg-background" />;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Modals */}
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
