import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import BookingModal from "./BookingModal";
import BookingDetailsModal from "./BookingDetailsModal";

interface Props {
  hotelId: string;
}

const CalendarManager = ({ hotelId }: Props) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, [hotelId]);

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
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(name, room_number), guests(name)')
      .eq('hotel_id', hotelId);
    
    if (error) {
      toast.error("Failed to load bookings");
      return;
    }
    setBookings(data || []);
  };

  const handleDateSelect = (selectInfo: any) => {
    const resource = selectInfo.resource;
    setSelectedDates({
      start: selectInfo.start,
      end: selectInfo.end
    });
    setSelectedRoom(resource?.id || null);
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const booking = bookings.find(b => b.id === clickInfo.event.id);
    setSelectedBooking(booking);
  };

  const handleEventDrop = async (dropInfo: any) => {
    const { event } = dropInfo;
    const resources = event.getResources();
    const resourceId = resources && resources.length > 0 ? resources[0].id : event._def.resourceIds[0];
    
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: format(event.start!, 'yyyy-MM-dd'),
        check_out: format(event.end!, 'yyyy-MM-dd'),
        room_id: resourceId
      })
      .eq('id', event.id);

    if (error) {
      toast.error("Failed to update booking");
      dropInfo.revert();
    } else {
      toast.success("Booking updated");
      fetchBookings();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    const { event } = resizeInfo;
    
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: format(event.start!, 'yyyy-MM-dd'),
        check_out: format(event.end!, 'yyyy-MM-dd')
      })
      .eq('id', event.id);

    if (error) {
      toast.error("Failed to resize booking");
      resizeInfo.revert();
    } else {
      toast.success("Booking dates updated");
      fetchBookings();
    }
  };

  const resources = rooms.map(room => ({
    id: room.id,
    title: `${room.room_number || room.name}`,
    extendedProps: {
      type: room.room_type,
      status: room.status
    }
  }));

  const events = bookings.map(booking => ({
    id: booking.id,
    resourceId: booking.room_id,
    title: booking.guests?.name || booking.guest_name,
    start: booking.check_in,
    end: booking.check_out,
    backgroundColor: booking.status === 'confirmed' ? '#22c55e' : 
                     booking.status === 'checked_in' ? '#3b82f6' : '#eab308',
    borderColor: 'transparent'
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reservation Calendar</h2>
          <p className="text-muted-foreground">Drag to create, resize, or move bookings</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <FullCalendar
          {...({
            plugins: [resourceTimelinePlugin, interactionPlugin],
            initialView: "resourceTimelineWeek",
            resources: resources,
            events: events,
            selectable: true,
            editable: true,
            select: handleDateSelect,
            eventClick: handleEventClick,
            eventDrop: handleEventDrop,
            eventResize: handleEventResize,
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
            },
            height: "auto"
          } as any)}
        />
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDates(null);
          setSelectedRoom(null);
        }}
        hotelId={hotelId}
        prefilledDates={selectedDates}
        prefilledRoomId={selectedRoom}
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
