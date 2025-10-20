import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
}

const BookingDetailsModal = ({ booking, onClose, onUpdate }: Props) => {
  const handleStatusUpdate = async (newStatus: string) => {
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
          
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge>{booking.status}</Badge>
          </div>
          
          <div className="flex gap-2 flex-wrap">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsModal;
