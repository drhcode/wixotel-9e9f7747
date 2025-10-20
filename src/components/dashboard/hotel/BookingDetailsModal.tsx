import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
}

const BookingDetailsModal = ({ booking, onClose, onUpdate }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setCheckIn(new Date(booking.check_in));
      setCheckOut(new Date(booking.check_out));
      setSelectedRoom(booking.room_id);
    }
  }, [booking]);

  useEffect(() => {
    if (isEditing && checkIn && checkOut) {
      fetchAvailableRooms();
    }
  }, [checkIn, checkOut, isEditing]);

  const fetchAvailableRooms = async () => {
    if (!checkIn || !checkOut) return;
    
    const { data, error } = await supabase
      .rpc('get_available_rooms', {
        p_hotel_id: booking.hotel_id,
        p_check_in: format(checkIn, 'yyyy-MM-dd'),
        p_check_out: format(checkOut, 'yyyy-MM-dd')
      });

    if (!error) {
      setAvailableRooms(data || []);
      if (selectedRoom && !(data || []).some((r: any) => r.id === selectedRoom)) {
        setSelectedRoom("");
      }
    }
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      onUpdate();
      onClose();
    }
  };

  const handleSaveChanges = async () => {
    if (!checkIn || !checkOut || !selectedRoom) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: format(checkIn, 'yyyy-MM-dd'),
        check_out: format(checkOut, 'yyyy-MM-dd'),
        room_id: selectedRoom
      })
      .eq('id', booking.id);

    setLoading(false);
    if (error) {
      toast.error("Failed to update booking");
    } else {
      toast.success("Booking updated successfully");
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this booking?")) return;
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Booking deleted");
      onUpdate();
      onClose();
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Guest</p>
            <p className="font-medium">{booking.guests?.name || booking.guest_name}</p>
          </div>
          
          {!isEditing ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Room</p>
                <p className="font-medium">{booking.rooms?.room_number || booking.rooms?.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{new Date(booking.check_in).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">{new Date(booking.check_out).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} - ${room.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkIn ? format(checkIn, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOut ? format(checkOut, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge>{booking.status}</Badge>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {!isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {booking.status === 'confirmed' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_in')}>
                    Check In
                  </Button>
                )}
                {booking.status === 'checked_in' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_out')}>
                    Check Out
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleSaveChanges} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsModal;
