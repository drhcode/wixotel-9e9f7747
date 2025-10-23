import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit2, AlertTriangle } from "lucide-react";
import { format, isToday } from "date-fns";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    
    // Normalize to start of day to avoid TZ issues
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const ci = normalize(checkIn);
    const co = normalize(checkOut);
    
    const { data, error } = await supabase
      .rpc('get_available_rooms', {
        p_hotel_id: booking.hotel_id,
        p_check_in: format(ci, 'yyyy-MM-dd'),
        p_check_out: format(co, 'yyyy-MM-dd'),
        p_booking_id: booking.id
      });

    if (!error) {
      setAvailableRooms(data || []);
      // Keep current room selected even if dates changed, as we excluded it from overlap check
      if (!selectedRoom) {
        setSelectedRoom(booking.room_id);
      }
    }
  };
  const canCheckIn = () => {
    return isToday(new Date(booking.check_in));
  };

  const canCheckOut = () => {
    return isToday(new Date(booking.check_out));
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (newStatus === 'checked_in' && !canCheckIn()) {
      toast.error("Check-in can only be done on the reservation date");
      return;
    }

    if (newStatus === 'checked_out' && !canCheckOut()) {
      toast.error("Check-out can only be done on the reservation checkout date");
      return;
    }

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
    // Normalize dates before updating
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const ci = normalize(checkIn);
    const co = normalize(checkOut);

    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: format(ci, 'yyyy-MM-dd'),
        check_out: format(co, 'yyyy-MM-dd'),
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

  const handleDeleteAttempt = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
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
                        {room.name} - €{room.price}
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

          <div>
            <p className="text-sm text-muted-foreground">Total Price</p>
            <p className="font-medium">€{booking.total_amount}</p>
          </div>

          {booking.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}

          {booking.status === 'confirmed' && !canCheckIn() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Check-in is only available on the reservation date ({format(new Date(booking.check_in), 'PPP')})
              </AlertDescription>
            </Alert>
          )}

          {booking.status === 'checked_in' && !canCheckOut() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Check-out is only available on the checkout date ({format(new Date(booking.check_out), 'PPP')})
              </AlertDescription>
            </Alert>
          )}

          {showDeleteConfirm && (
            <div className="space-y-2 p-4 border rounded-lg bg-destructive/10">
              <p className="text-sm font-medium">Are you sure you want to delete this booking?</p>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {!isEditing && !showDeleteConfirm ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {booking.status === 'confirmed' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_in')} disabled={!canCheckIn()}>
                    Check In
                  </Button>
                )}
                {booking.status === 'checked_in' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_out')} disabled={!canCheckOut()}>
                    Check Out
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={handleDeleteAttempt}>
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </>
            ) : showDeleteConfirm ? (
              <>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  Confirm Delete
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
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
