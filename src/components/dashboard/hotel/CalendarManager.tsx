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
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(startOfMonth(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  // Drag states
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ roomId: string; start: number; end: number } | null>(null);
  const [prefilledDates, setPrefilledDates] = useState<{ start: Date; end: Date } | null>(null);
  const [prefilledRoomId, setPrefilledRoomId] = useState<string | null>(null);

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

  const timelineDates = generateTimelineDates();

  const getBookingsForRoomInTimeline = (roomId: string) => {
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

      {/* Desktop Timeline */}
      <div className="hidden lg:block">
        <Card className="p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Timeline View</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTimelineStartDate(subMonths(timelineStartDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTimelineStartDate(new Date())}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTimelineStartDate(addMonths(timelineStartDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1500px] bg-background">
              <div
                className="grid relative"
                style={{ gridTemplateColumns: "300px repeat(auto-fill, minmax(80px,1fr))" }}
              >
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
                    <div className={`text-xs ${isSameDay(date, new Date()) ? "text-primary" : "font-semibold"}`}>
                      {format(date, "EEE")}
                    </div>
                    <div className={`text-sm ${isSameDay(date, new Date()) ? "text-primary" : ""}`}>
                      {format(date, "dd")}
                    </div>
                    <div
                      className={`text-xs ${isSameDay(date, new Date()) ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {format(date, "MMM")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Room rows */}
              {rooms.map((room) => {
                const roomBookings = getBookingsForRoomInTimeline(room.id);
                const renderedIndices = new Set<number>();

                return (
                  <div
                    key={room.id}
                    className="grid relative"
                    style={{ gridTemplateColumns: "300px repeat(auto-fill, minmax(80px,1fr))" }}
                  >
                    <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="text-sm font-bold">
                        {room.room_number} {room.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-1">Room</div>
                    </div>

                    {timelineDates.map((date, idx) => {
                      if (renderedIndices.has(idx)) return null;

                      // Check if a booking starts here
                      const booking = roomBookings.find((b) => isSameDay(b.start, date));
                      if (booking) {
                        for (let i = 0; i <= booking.span; i++) renderedIndices.add(idx + i);

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

                      // Drag preview
                      const handleMouseDown = () => {
                        setDragStartIndex(idx);
                        setDragEndIndex(idx);
                        setIsDragging(true);
                        setDragPreview({ roomId: room.id, start: idx, end: idx });
                      };
                      const handleMouseEnter = () => {
                        if (isDragging && dragStartIndex !== null) {
                          setDragEndIndex(idx);
                          setDragPreview({ roomId: room.id, start: dragStartIndex, end: idx });
                        }
                      };
                      const handleMouseUp = () => {
                        if (dragStartIndex !== null && dragEndIndex !== null) {
                          const start = timelineDates[Math.min(dragStartIndex, dragEndIndex)];
                          const end = addDays(timelineDates[Math.max(dragStartIndex, dragEndIndex)], 1);
                          setPrefilledDates({ start, end });
                          setPrefilledRoomId(room.id);
                          setIsModalOpen(true);
                        }
                        setDragStartIndex(null);
                        setDragEndIndex(null);
                        setIsDragging(false);
                        setDragPreview(null);
                      };

                      return (
                        <div
                          key={date.toISOString()}
                          className="border-b border-r min-h-[80px] bg-background hover:bg-accent/20 transition-colors relative"
                          onMouseDown={handleMouseDown}
                          onMouseEnter={handleMouseEnter}
                          onMouseUp={handleMouseUp}
                        >
                          {isDragging &&
                            dragPreview?.roomId === room.id &&
                            idx >= Math.min(dragPreview.start, dragPreview.end) &&
                            idx <= Math.max(dragPreview.start, dragPreview.end) && (
                              <div className="absolute inset-1/4 bg-primary/20 border-2 border-primary rounded-lg" />
                            )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile Calendar View remains the same */}
      {/* ... your existing mobile calendar code ... */}

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hotelId={hotelId}
        prefilledDates={prefilledDates}
        prefilledRoomId={prefilledRoomId}
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
