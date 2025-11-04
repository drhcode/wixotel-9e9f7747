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
import { getCountries, getCitiesForCountry } from "@/lib/countries";
import { z } from "zod";
import { mapDatabaseError } from "@/lib/errorUtils";

const guestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  phone: z.string().optional(),
  email: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  guestCount: z.number().optional(),
  notes: z.string().optional(),
  totalPrice: z.number().optional(),
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
  const [guestCountry, setGuestCountry] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestCount, setGuestCount] = useState<number>(1);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchGuests();
      if (checkIn && checkOut) {
        fetchAvailableRooms();
      }
    }
  }, [isOpen, checkIn, checkOut]);

  useEffect(() => {
    if (guestCountry) {
      const cities = getCitiesForCountry(guestCountry);
      setAvailableCities(cities);
      if (guestCity && !cities.includes(guestCity)) {
        setGuestCity("");
      }
    } else {
      setAvailableCities([]);
      setGuestCity("");
    }
  }, [guestCountry]);

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
      toast.error("Check-out must be at least 1 day after check-in");
      return;
    }

    if (!selectedRoom) {
      toast.error("Please select a room");
      return;
    }

    if (!guestName.trim()) {
      toast.error("Please enter guest full name");
      setValidationErrors({ fullName: "Full name is required" });
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      let guestId = selectedGuest;

      if (selectedGuest === "new" || !selectedGuest) {
        const validation = guestSchema.safeParse({
          fullName: guestName,
          phone: guestPhone,
          email: guestEmail,
          country: guestCountry,
          city: guestCity,
          guestCount,
          notes,
          totalPrice,
        });

        if (!validation.success) {
          const errors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0] as string] = err.message;
            }
          });
          setValidationErrors(errors);
          toast.error("Please fill required fields correctly");
          setLoading(false);
          return;
        }

        const { data: newGuest, error: guestError } = await supabase
          .from("guests")
          .insert({
            hotel_id: hotelId,
            name: guestName,
            phone: guestPhone,
            email: guestEmail,
            country: guestCountry,
            city: guestCity,
            address: guestAddress,
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
          {/* Check-in & Check-out */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in *</Label>
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
                        if (checkOut <= date) {
                          setCheckOut(minCheckout);
                        }
                        setCheckInOpen(false);
                        setCheckOutOpen(true);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Check-out *</Label>
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
            <Label>Room *</Label>
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
            <Label>Full Name *</Label>
            <Input
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setValidationErrors((prev) => ({ ...prev, fullName: "" }));
              }}
              className={validationErrors.fullName ? "border-destructive" : ""}
            />
            {validationErrors.fullName && <p className="text-xs text-destructive mt-1">{validationErrors.fullName}</p>}
          </div>

          {/* Guest Count */}
          <div>
            <Label>Number of Guests</Label>
            <Input
              type="number"
              min="1"
              value={guestCount === 0 ? "" : guestCount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setGuestCount(0);
                } else {
                  setGuestCount(Number(value));
                }
              }}
            />
          </div>

          {/* Notes */}
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
