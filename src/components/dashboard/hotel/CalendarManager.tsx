import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  addDays,
  startOfDay,
  differenceInDays,
  isSameDay,
} from "date-fns";
import BookingModal from "./BookingModal";
import BookingDetailsModal from "./BookingDetailsModal";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarLegend } from "./calendar/CalendarLegend";
import { CalendarTimeline } from "./calendar/CalendarTimeline";
import { CalendarMonthView } from "./calendar/CalendarMonthView";
import { CalendarBookingsList } from "./calendar/CalendarBookingsList";

interface Props {
  hotelId: string;
}

const CalendarManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const lastBookingsJson = useRef<string>("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(startOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [ready, setReady] = useState(true); // will defer for Safari if needed
  const [isSyncing, setIsSyncing] = useState(false);
  const TIMELINE_DAYS = 12;

  // Detect iOS Safari / iOS WebKit (treat as Safari)
  const isSafari = useMemo(() => {
    const ua = navigator.userAgent;
    const isiOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    const isWebKit = /AppleWebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    return isiOS && isWebKit;
  }, []);

  // Defer heavy render on Safari briefly to avoid stack issues
  useEffect(() => {
    if (isSafari) {
      setReady(false);
      const t = setTimeout(() => setReady(true), 120);
      return () => clearTimeout(t);
    } else {
      setReady(true);
    }
  }, [isSafari]);

  // Fetch rooms when hotelId changes
  useEffect(() => {
    if (!hotelId) return;
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // Listen for real-time room status updates
  useEffect(() => {
    if (!hotelId) return;

    const channel = supabase
      .channel('room-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `hotel_id=eq.${hotelId}`
        },
        (payload) => {
          console.log('Room status realtime update:', payload);
          console.log('Old status:', payload.old, 'New status:', payload.new);
          
          // Update the room in the local state
          setRooms(prevRooms => {
            const updatedRooms = prevRooms.map(room => 
              room.id === payload.new.id 
                ? { ...room, ...payload.new }
                : room
            );
            console.log('Updated rooms state:', updatedRooms);
            return updatedRooms;
          });
          
          // Show a subtle notification for automatic status changes to dirty
          if (payload.new.status === 'dirty' && payload.old?.status !== 'dirty') {
            toast.info(
              `Room ${payload.new.room_number || payload.new.name} marked as dirty after checkout`,
              { duration: 3000 }
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Room status channel subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  // Safari-only: fetch bookings for the single selected date
  useEffect(() => {
    if (!hotelId) return;
    if (!isSafari) return;

    let ignore = false;
    const run = async () => {
      await fetchBookingsForDate(selectedDate, { ignoreRef: () => ignore });
    };
    run();
    return () => {
      ignore = true;
    };
    // only depend on hotelId and selectedDate for Safari
  }, [hotelId, selectedDate, isSafari]);

  // Non-Safari: fetch bookings for month + timeline
  useEffect(() => {
    if (!hotelId) return;
    if (isSafari) return;

    let ignore = false;
    const run = async () => {
      await fetchBookings({ ignoreRef: () => ignore });
    };
    run();
    return () => {
      ignore = true;
    };
    // month & timeline changes should trigger for non-safari
  }, [hotelId, currentMonth, timelineStartDate, isSafari]);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Failed to load rooms");
        setIsLoading(false);
        return;
      }
      setRooms(data || []);
    } catch (err) {
      console.error("fetchRooms error:", err);
      toast.error("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to set bookings only if changed
  const setBookingsIfChanged = (newData: any[] | null) => {
    const json = JSON.stringify(newData || []);
    if (json !== lastBookingsJson.current) {
      lastBookingsJson.current = json;
      setBookings(newData || []);
    }
  };

  const fetchBookingsForDate = async (date: Date, opts?: { ignoreRef?: () => boolean }) => {
    setIsLoading(true);
    try {
      const dateStr = format(startOfDay(date), "yyyy-MM-dd");

      // Fetch bookings that overlap with the selected date
      const { data, error } = await supabase
        .from("bookings")
        .select("*, rooms(name, room_number), guests(name)")
        .eq("hotel_id", hotelId)
        .lte("check_in", dateStr)
        .gt("check_out", dateStr);

      if (opts?.ignoreRef?.()) return;

      if (error) {
        toast.error("Failed to load bookings");
        return;
      }
      setBookingsIfChanged(data || []);
    } catch (err) {
      console.error("fetchBookingsForDate error:", err);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async (opts?: { ignoreRef?: () => boolean }) => {
    setIsLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const timelineEnd = addDays(timelineStartDate, TIMELINE_DAYS - 1);

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

      if (opts?.ignoreRef?.()) return;

      if (error) {
        toast.error("Failed to load bookings");
        return;
      }
      setBookingsIfChanged(data || []);
    } catch (err) {
      console.error("fetchBookings error:", err);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const getBookingsForDate = (date: Date) => {
    const d = format(startOfDay(date), "yyyy-MM-dd");
    return bookings.filter((booking) => {
      const checkIn = format(startOfDay(new Date(booking.check_in)), "yyyy-MM-dd");
      const checkOut = format(startOfDay(new Date(booking.check_out)), "yyyy-MM-dd");
      // Occupied for dates >= checkIn and < checkOut (checkout day is free)
      return d >= checkIn && d < checkOut;
    });
  };

  const selectedDateBookings = useMemo(() => getBookingsForDate(selectedDate), [bookings, selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reserved":
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

  const getBookingsForRoom = (roomId: string, date: Date) => {
    const d = format(startOfDay(date), "yyyy-MM-dd");
    return bookings.filter(
      (booking) =>
        booking.room_id === roomId &&
        d >= format(startOfDay(new Date(booking.check_in)), "yyyy-MM-dd") &&
        d < format(startOfDay(new Date(booking.check_out)), "yyyy-MM-dd"),
    );
  };

  const getStartCellBookingForRoom = (roomId: string, date: Date) => {
    const lastVisibleDate = startOfDay(addDays(timelineStartDate, TIMELINE_DAYS - 1));
    const windowStart = startOfDay(timelineStartDate);
    const dateStr = format(startOfDay(date), "yyyy-MM-dd");

    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue;

      const bStart = startOfDay(new Date(booking.check_in));
      const bEnd = startOfDay(new Date(booking.check_out));
      // Last occupied day is one day before checkout (checkout day is free)
      const lastOccupiedDay = addDays(bEnd, -1);

      // Check if booking overlaps with window (checkout day not occupied)
      const overlaps =
        bStart.getTime() <= lastVisibleDate.getTime() && lastOccupiedDay.getTime() >= windowStart.getTime();
      if (!overlaps) continue;

      // Start cell is the later of booking start and window start
      const startCellDate = new Date(Math.max(bStart.getTime(), windowStart.getTime()));
      const startCellStr = format(startCellDate, "yyyy-MM-dd");

      if (startCellStr === dateStr) {
        return booking;
      }
    }

    return null;
  };

  const generateTimelineDates = useMemo(() => {
    const dates: Date[] = [];
    const normalizedStart = startOfDay(timelineStartDate);
    for (let i = 0; i < TIMELINE_DAYS; i++) {
      dates.push(startOfDay(addDays(normalizedStart, i)));
    }
    return dates;
  }, [timelineStartDate]);

  const getBookingPosition = (booking: any, date: Date) => {
    const checkIn = startOfDay(new Date(booking.check_in));
    const checkOut = startOfDay(new Date(booking.check_out));
    const currentDate = startOfDay(date);
    const windowStart = startOfDay(timelineStartDate);
    const lastVisibleDate = startOfDay(addDays(timelineStartDate, TIMELINE_DAYS - 1));

    // Start cell for this booking within current window
    const startCell = new Date(Math.max(checkIn.getTime(), windowStart.getTime()));

    // End cell is one day before check-out (check-out day is not occupied)
    const lastOccupiedDay = addDays(checkOut, -1);
    const endCell = new Date(Math.min(lastOccupiedDay.getTime(), lastVisibleDate.getTime()));

    if (isSameDay(startCell, currentDate)) {
      // Calculate span as number of occupied cells
      const span = Math.max(1, differenceInDays(endCell, startCell) + 1);

      return {
        start: true,
        span,
      };
    }
    return { start: false, span: 0 };
  };

  const handleSyncIcal = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-icals');
      
      if (error) throw error;
      
      toast.success(`Synced ${data.totalFeeds} calendar feeds successfully`);
      
      // Refresh bookings after sync
      if (isSafari) {
        await fetchBookingsForDate(selectedDate);
      } else {
        await fetchBookings();
      }
    } catch (error: any) {
      console.error('iCal sync error:', error);
      toast.error(error.message || 'Failed to sync calendars');
    } finally {
      setIsSyncing(false);
    }
  };

  const modifiers = useMemo(() => {
    if (isSafari) return {} as Record<string, Date[]>;
    const booked = bookings
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
      .flat();
    return { booked } as Record<string, Date[]>;
  }, [bookings, isSafari]);

  const modifiersStyles = {
    booked: {
      backgroundColor: "hsl(var(--primary) / 0.15)",
      color: "hsl(var(--primary))",
      fontWeight: "600",
      borderRadius: "10px",
      border: "2px solid hsl(var(--primary) / 0.3)",
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

      <CalendarHeader 
        onNewReservation={() => setIsModalOpen(true)}
        onSyncIcal={handleSyncIcal}
        isSyncing={isSyncing}
      />

      <CalendarLegend />

      {/* Desktop Timeline View - Hidden on Safari */}
      {!isSafari && ready && (
        <CalendarTimeline
          rooms={rooms}
          timelineStartDate={timelineStartDate}
          onTimelineStartDateChange={setTimelineStartDate}
          TIMELINE_DAYS={TIMELINE_DAYS}
          getStartCellBookingForRoom={getStartCellBookingForRoom}
          getBookingPosition={getBookingPosition}
          getStatusColor={getStatusColor}
          onBookingClick={setSelectedBooking}
        />
      )}

      {(!isSafari || ready) && (
        <CalendarMonthView
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onCurrentMonthChange={setCurrentMonth}
          onSelectedDateChange={setSelectedDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          isSafari={isSafari}
        />
      )}

      <div className="md:hidden">
        <CalendarBookingsList
          selectedDate={selectedDate}
          bookings={selectedDateBookings}
          rooms={rooms}
          onBookingClick={setSelectedBooking}
          getStatusColor={getStatusColor}
        />
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hotelId={hotelId}
        prefilledDates={null}
        prefilledRoomId={null}
        onSuccess={isSafari ? () => fetchBookingsForDate(selectedDate) : fetchBookings}
      />

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={isSafari ? () => fetchBookingsForDate(selectedDate) : fetchBookings}
        />
      )}
    </div>
  );
};

export default CalendarManager;
