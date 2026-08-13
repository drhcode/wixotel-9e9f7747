import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit2, AlertTriangle, Printer } from "lucide-react";
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
  const [showCancellationRequest, setShowCancellationRequest] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed">("pending");

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=300,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Receipt</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0;
              padding: 10mm;
              font-size: 12px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .label { font-weight: bold; }
            h1 { font-size: 16px; margin: 10px 0; }
            h2 { font-size: 14px; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>${booking.hotels?.name || 'Hotel'}</h1>
            <div class="bold">BOOKING RECEIPT</div>
          </div>
          <div class="line"></div>
          <div class="row">
            <span class="label">Confirmation:</span>
            <span>${booking.confirmation_number}</span>
          </div>
          <div class="line"></div>
          <div class="row">
            <span class="label">Guest:</span>
            <span>${booking.full_name || booking.guests?.name || ''}</span>
          </div>
          <div class="row">
            <span class="label">Room:</span>
            <span>${booking.rooms?.name || ''} ${booking.rooms?.room_number ? '('+booking.rooms.room_number+')' : ''}</span>
          </div>
          <div class="line"></div>
          <div class="row">
            <span class="label">Check-in:</span>
            <span>${format(new Date(booking.check_in), 'dd/MM/yyyy')}</span>
          </div>
          <div class="row">
            <span class="label">Check-out:</span>
            <span>${format(new Date(booking.check_out), 'dd/MM/yyyy')}</span>
          </div>
          <div class="row">
            <span class="label">Guests:</span>
            <span>${booking.guest_count || 1}</span>
          </div>
          <div class="line"></div>
          <div class="row">
            <span class="label">Total Amount:</span>
            <span class="bold">€${booking.total_amount}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="margin-top: 10px; font-size: 10px;">
            Thank you for your booking!
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  useEffect(() => {
    if (booking) {
      setCheckIn(new Date(booking.check_in));
      setCheckOut(new Date(booking.check_out));
      setSelectedRoom(booking.room_id);
      setGuestName(booking.full_name || booking.guests?.name || "");
      setGuestEmail(booking.guest_email || "");
      setGuestPhone(booking.guest_phone || "");
      setGuestCount(booking.guest_count || 1);
      setNotes(booking.notes || "");
      setTotalAmount(booking.total_amount?.toString() || "");
      setStatus(booking.status);
      setPaymentStatus(booking.payment_status === "completed" ? "completed" : "pending");
    }
  }, [booking]);

  useEffect(() => {
    if (isEditing && checkIn && checkOut) {
      fetchAvailableRooms();
    }
  }, [checkIn, checkOut, isEditing]);

  // Auto-calculate price when dates or room changes during edit
  useEffect(() => {
    if (isEditing && selectedRoom && checkIn && checkOut && availableRooms.length > 0) {
      const room = availableRooms.find(r => r.id === selectedRoom);
      if (room) {
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const calculatedPrice = room.price * nights;
        setTotalAmount(calculatedPrice.toString());
      }
    }
  }, [isEditing, selectedRoom, checkIn, checkOut, availableRooms]);

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
    const checkInDate = new Date(booking.check_in);
    const today = new Date();
    checkInDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today >= checkInDate; // Allow check-in on or after the reservation date
  };

  const canCheckOut = () => {
    return isToday(new Date(booking.check_out));
  };

  const hasCheckedIn = () => {
    const checkInDate = new Date(booking.check_in);
    const today = new Date();
    checkInDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today >= checkInDate;
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (newStatus === 'checked_in' && !canCheckIn()) {
      toast.error("Check-in can only be done on or after the reservation date");
      return;
    }


    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id);

    if (error) {
      console.error('Failed to update booking status:', error);
      toast.error("Failed to update status");
    } else {
      
      // Update earnings status to completed when guest checks out
      if (newStatus === 'checked_out') {
        await supabase
          .from('earnings')
          .update({ status: 'completed' })
          .eq('booking_id', booking.id);
      }
      
      toast.success("Status updated");
      onUpdate();
      onClose();
    }
  };

  const handleSaveChanges = async () => {
    if (!checkIn || !checkOut || !selectedRoom || !guestName || !guestPhone) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Validate minimum 1 night stay
    if (checkOut <= checkIn) {
      toast.error("Check-out must be at least 1 day after check-in");
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
        room_id: selectedRoom,
        full_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim(),
        guest_count: guestCount,
        notes: notes.trim() || null,
        total_amount: parseFloat(totalAmount) || 0,
        payment_status: paymentStatus
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
    // Prevent deletion of checked-in or checked-out bookings
    if (booking.status === 'checked_in' || booking.status === 'checked_out') {
      toast.error("Cannot delete bookings after check-in. Please contact support if you need to modify this reservation.");
      setShowDeleteConfirm(false);
      return;
    }

    // Prevent direct deletion of bookings from leads
    if (booking.source === 'lead') {
      toast.error("Cannot delete bookings from leads directly. Please use 'Request Cancellation' instead.");
      setShowDeleteConfirm(false);
      return;
    }

    // Earnings will be automatically set to 'cancelled' by database trigger
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

  const handleRequestCancellation = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('cancellation_requests').insert({
        booking_id: booking.id,
        hotel_id: booking.hotel_id,
        reason: cancellationReason,
        requested_by: user.id,
      });

      if (error) throw error;

      // Create notification for super admin
      await supabase.from('notifications').insert({
        hotel_id: booking.hotel_id,
        type: 'cancellation_request',
        title: 'Cancellation Request',
        message: `Cancellation request for booking ${booking.confirmation_number || booking.full_name}`,
      });

      toast.success("Cancellation request sent to admin for approval");
      setShowCancellationRequest(false);
      setCancellationReason("");
      onClose();
    } catch (error: any) {
      console.error("Error submitting cancellation request:", error);
      toast.error("Failed to submit cancellation request");
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isEditing ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Guest</p>
                <p className="font-medium">{booking.full_name || booking.guests?.name}</p>
              </div>
              
              {booking.confirmation_number && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border-2 border-primary/30">
                  <p className="text-sm text-muted-foreground mb-1">Confirmation Number</p>
                  <p className="text-xl font-bold font-mono tracking-wider text-primary">{booking.confirmation_number}</p>
                  <p className="text-xs text-muted-foreground mt-1">Use this number for check-in and review submission</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">Room</p>
                <p className="font-medium">{booking.rooms?.room_number || booking.rooms?.name}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{new Date(booking.check_in).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">{new Date(booking.check_out).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Guest Email</p>
                  <p className="font-medium">{booking.guest_email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest Phone</p>
                  <p className="font-medium">{booking.guest_phone}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Guest Count</p>
                <p className="font-medium">{booking.guest_count}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{booking.status}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <span 
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: booking.payment_status === "completed" ? "#10b98115" : "#ef444415",
                    color: booking.payment_status === "completed" ? "#10b981" : "#ef4444",
                    border: `1px solid ${booking.payment_status === "completed" ? "#10b98140" : "#ef444440"}`
                  }}
                >
                  <span className={`w-2 h-2 rounded-full ${booking.payment_status === "completed" ? "bg-green-500" : "bg-red-500"}`}></span>
                  {booking.payment_status === "completed" ? "Paid" : "Unpaid"}
                </span>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="font-medium">€{booking.total_amount}</p>
              </div>

              {booking.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <div className="text-sm space-y-1">
                    {booking.notes.split('\n').map((line: string, i: number) => {
                      // Check if line contains "Reservation URL:"
                      if (line.includes('Reservation URL:')) {
                        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                        if (urlMatch) {
                          const url = urlMatch[0];
                          return (
                            <div key={i} className="bg-primary/5 p-2 rounded border border-primary/20">
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary font-medium underline hover:text-primary/80 flex items-center gap-1"
                              >
                                Reservation URL: View on Platform →
                              </a>
                            </div>
                          );
                        }
                      }
                      return <div key={i}>{line}</div>;
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guest Email</Label>
                  <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Guest Phone *</Label>
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+1234567890" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Guest Count *</Label>
                <Input type="number" min="1" value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)} />
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !checkIn && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkIn ? format(checkIn, "MMM dd, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={checkIn} 
                        onSelect={(date) => {
                          if (date) {
                            setCheckIn(date);
                            // Auto-adjust checkout to be at least 1 day after check-in
                            const minCheckout = new Date(date);
                            minCheckout.setDate(minCheckout.getDate() + 1);
                            if (checkOut && checkOut <= date) {
                              setCheckOut(minCheckout);
                            }
                            setCheckInOpen(false);
                          }
                        }}
                        initialFocus 
                        className="pointer-events-auto" 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !checkOut && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOut ? format(checkOut, "MMM dd, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={checkOut} 
                        onSelect={(date) => {
                          if (date) {
                            setCheckOut(date);
                            setCheckOutOpen(false);
                          }
                        }}
                        disabled={(date) => checkIn ? date <= checkIn : false}
                        initialFocus 
                        className="pointer-events-auto" 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total Amount *</Label>
                <Input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" />
              </div>

              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(value: "pending" | "completed") => setPaymentStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Unpaid
                      </span>
                    </SelectItem>
                    <SelectItem value="completed">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Paid
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {booking.status === 'reserved' && !canCheckIn() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Check-in is only available on or after the reservation date ({format(new Date(booking.check_in), 'MMM dd, yyyy')})
              </AlertDescription>
            </Alert>
          )}

          {showDeleteConfirm && (
            <div className="space-y-2 p-4 border rounded-lg bg-destructive/10">
              <p className="text-sm font-medium">Are you sure you want to delete this booking?</p>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              {(booking.status === 'checked_in' || booking.status === 'checked_out') && (
                <p className="text-xs text-warning font-medium mt-2">
                  Note: Bookings cannot be deleted after check-in. Please contact support if you need assistance.
                </p>
              )}
              {booking.source === 'lead' && (
                <p className="text-xs text-warning font-medium mt-2">
                  Note: Bookings from leads cannot be deleted directly. Please use "Request Cancellation" instead.
                </p>
              )}
            </div>
          )}

          {showCancellationRequest && (
            <div className="space-y-3 p-4 border rounded-lg bg-warning/10">
              <p className="text-sm font-medium">Request Booking Cancellation</p>
              <p className="text-xs text-muted-foreground">
                This booking originated from a lead. Cancellation requests require super admin approval.
              </p>
              <div className="space-y-2">
                <Label htmlFor="cancellation-reason">Reason for Cancellation *</Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Please provide a reason for cancelling this booking..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap justify-start sm:justify-start">
            {!isEditing && !showDeleteConfirm && !showCancellationRequest ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {booking.status === 'reserved' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_in')} disabled={!canCheckIn()}>
                    Check In
                  </Button>
                )}
                {booking.status === 'checked_in' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('checked_out')}>
                    Check Out
                  </Button>
                )}
                {booking.source === 'lead' ? (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => setShowCancellationRequest(true)}
                    disabled={booking.status === 'checked_in' || booking.status === 'checked_out'}
                    title={
                      (booking.status === 'checked_in' || booking.status === 'checked_out')
                        ? 'Cannot request cancellation after check-in'
                        : 'Request cancellation for approval'
                    }
                  >
                    Request Cancellation
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleDeleteAttempt}
                    disabled={booking.status === 'checked_in' || booking.status === 'checked_out'}
                    title={
                      (booking.status === 'checked_in' || booking.status === 'checked_out')
                        ? 'Bookings cannot be deleted after check-in. Contact support for assistance.' 
                        : 'Delete this booking'
                    }
                  >
                    Delete
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
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
            ) : showCancellationRequest ? (
              <>
                <Button size="sm" variant="destructive" onClick={handleRequestCancellation}>
                  Submit Request
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowCancellationRequest(false);
                  setCancellationReason("");
                }}>
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
