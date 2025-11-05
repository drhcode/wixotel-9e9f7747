import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { mapDatabaseError } from "@/lib/errorUtils";

// ✅ Only Full Name is required for guest validation
const guestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  guestCount: z.number().min(1, "At least 1 guest required").optional(),
  notes: z.string().optional(),
  totalPrice: z.number().min(0).optional(),
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  prefilledDates?: { start: Date; end: Date } | null;
  prefilledRoomId?: string | null;
  onSuccess: () => void;
}

const BookingModal = ({ isOpen, onClose, hotelId, prefilledDates, prefilledRoomId, onSuccess }: Props) => {
  const [checkIn, setCheckIn] = useState<Date>(prefilledDates?.start || new Date());
  const [checkOut, setCheckOut] = useState<Date>(prefilledDates?.end || new Date());
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState(prefilledRoomId || "");
  const [selectedGuest, setSelectedGuest] = useState("");
  const [guestSearchTerm, setGuestSearchTerm] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchGuests();
      if (checkIn && checkOut) fetchAvailableRooms();
    }
  }, [isOpen, checkIn, checkOut]);

  const fetchGuests = async () => {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false })
      .limit(9);
    setGuests(data || []);
  };

  const searchGuests = async (term: string) => {
    if (!term.trim()) {
      fetchGuests();
      return;
    }
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("hotel_id", hotelId)
      .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .order("created_at", { ascending: false });
    setGuests(data || []);
  };

  const fetchAvailableRooms = async () => {
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const ci = normalize(checkIn);
    const co = normalize(checkOut);

    const { data, error } = await supabase.rpc("get_available_rooms", {
      p_hotel_id: hotelId,
      p_check_in: format(ci, "yyyy-MM-dd"),
      p_check_out: format(co, "yyyy-MM-dd"),
    });

    if (!error) {
      setAvailableRooms(data || []);
      if (selectedRoom && !(data || []).some((r: any) => r.id === selectedRoom)) {
        setSelectedRoom("");
      }
    }
  };

  // Auto-calc total price
  useEffect(() => {
    if (selectedRoom && checkIn && checkOut) {
      const room = availableRooms.find((r) => r.id === selectedRoom);
      if (room) {
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        setTotalPrice(room.price * nights);
      }
    }
  }, [selectedRoom, checkIn, checkOut, availableRooms]);

  const handleSubmit = async () => {
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (checkOut <= checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }
    if (!selectedRoom) {
      toast.error("Please select a room");
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      let guestId = selectedGuest;

      // Create guest if new or no guest selected
      if (selectedGuest === "new" || !selectedGuest) {
        // Only validate full name is required
        if (!guestName || guestName.trim().length === 0) {
          setValidationErrors({ fullName: "Full name is required" });
          toast.error("Please enter guest full name");
          setLoading(false);
          return;
        }

        if (guestName.trim().length > 100) {
          setValidationErrors({ fullName: "Name too long" });
          toast.error("Guest name must be less than 100 characters");
          setLoading(false);
          return;
        }

        const { data: newGuest, error: guestError } = await supabase
          .from("guests")
          .insert({
            hotel_id: hotelId,
            name: guestName.trim(),
            phone: guestPhone || "",
            email: guestEmail || null,
          })
          .select()
          .single();

        if (guestError) throw guestError;
        guestId = newGuest.id;
      }

      const room = availableRooms.find((r) => r.id === selectedRoom);
      const existingGuest = guests.find((g) => g.id === guestId);
      const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const ci = normalize(checkIn);
      const co = normalize(checkOut);
      const confirmationNumber = `wixo${Date.now()}${Math.random().toString(36).substring(2, 9)}`.toUpperCase();

      const { error } = await supabase.from("bookings").insert({
        hotel_id: hotelId,
        room_id: selectedRoom,
        guest_id: guestId,
        full_name: guestName || existingGuest?.name,
        guest_phone: guestPhone || existingGuest?.phone,
        guest_email: guestEmail || existingGuest?.email,
        check_in: format(ci, "yyyy-MM-dd"),
        check_out: format(co, "yyyy-MM-dd"),
        total_amount: totalPrice,
        guest_count: guestCount,
        notes,
        status: "reserved",
        confirmation_number: confirmationNumber,
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        hotel_id: hotelId,
        type: "booking_created",
        title: "New Reservation",
        message: `New reservation created for ${guestName || existingGuest?.name}`,
      });

      toast.success("Reservation created successfully");

      // Clear form
      setCheckIn(new Date());
      setCheckOut(new Date());
      setSelectedRoom("");
      setSelectedGuest("");
      setGuestSearchTerm("");
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      setGuestCount(1);
      setNotes("");
      setTotalPrice(0);
      setValidationErrors({});

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(mapDatabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in</Label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkIn, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(date) => {
                      if (date) {
                        setCheckIn(date);
                        const minCheckout = new Date(date);
                        minCheckout.setDate(minCheckout.getDate() + 1);
                        if (checkOut <= date) setCheckOut(minCheckout);
                        setCheckInOpen(false);
                        setCheckOutOpen(true);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Check-out</Label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkOut, "MMM dd, yyyy")}
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
                    disabled={(date) => date <= checkIn}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Room */}
          <div>
            <Label>Available Rooms</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.room_number || room.name} - €{room.price}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guest */}
          <div>
            <Label>Guest</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search guests by name, email, or phone..."
                value={guestSearchTerm}
                onChange={(e) => {
                  setGuestSearchTerm(e.target.value);
                  searchGuests(e.target.value);
                }}
              />
              <Select value={selectedGuest} onValueChange={setSelectedGuest}>
                <SelectTrigger>
                  <SelectValue placeholder="Select existing or add new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Add New Guest</SelectItem>
                  {guests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* New guest */}
          {(!selectedGuest || selectedGuest === "new") && (
            <>
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, fullName: "" }));
                  }}
                  className={validationErrors.fullName ? "border-destructive" : ""}
                />
                {validationErrors.fullName && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.fullName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Number of Guests</Label>
            <Input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div>
            <Label>Total Price (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading || !selectedRoom}>
              {loading ? "Creating..." : "Create Reservation"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
