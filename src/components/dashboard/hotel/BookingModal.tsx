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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  const [checkOut, setCheckOut] = useState<Date>(
    prefilledDates?.end || new Date(new Date().setDate(new Date().getDate() + 1)),
  );
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
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

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
      .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    setGuests(data || []);
  };

  const fetchAvailableRooms = async () => {
    setLoadingRooms(true);
    try {
      const ci = format(checkIn, "yyyy-MM-dd");
      const co = format(checkOut, "yyyy-MM-dd");

      // Fetch all rooms
      const { data: allRooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name, room_number, price")
        .eq("hotel_id", hotelId);

      if (roomsError) throw roomsError;

      // Fetch bookings that overlap the desired range
      const { data: overlappingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("room_id, check_in, check_out")
        .eq("hotel_id", hotelId)
        .not("status", "eq", "cancelled")
        // Exclude same-day checkouts as occupied (room free on checkout day)
        .or(`and(check_in.lt.${co},check_out.gt.${ci})`);

      if (bookingsError) throw bookingsError;

      const bookedRoomIds = new Set(overlappingBookings.map((b) => b.room_id));
      const available = allRooms.filter((r) => !bookedRoomIds.has(r.id));

      setAvailableRooms(available);
      if (selectedRoom && !available.some((r) => r.id === selectedRoom)) {
        setSelectedRoom("");
      }
    } catch (err: any) {
      toast.error("Failed to load available rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!selectedRoom) {
        toast.error("Please select a room");
        setLoading(false);
        return;
      }

      let guestId = selectedGuest;

      if (selectedGuest === "new" || !selectedGuest) {
        if (!guestName || !guestPhone) {
          toast.error("Guest name and phone are required");
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
      const { error } = await supabase.from("bookings").insert({
        hotel_id: hotelId,
        room_id: selectedRoom,
        guest_id: guestId,
        guest_name: guestName || guests.find((g) => g.id === guestId)?.name,
        guest_phone: guestPhone || guests.find((g) => g.id === guestId)?.phone,
        guest_email: guestEmail || guests.find((g) => g.id === guestId)?.email,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        total_amount: room?.price || 0,
        guest_count: guestCount,
        notes,
        status: "confirmed",
      });

      if (error) throw error;

      toast.success("Reservation created successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
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
          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in</Label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkIn, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(date) => {
                      if (date) {
                        setCheckIn(date);
                        if (checkOut <= date) {
                          const nextDay = new Date(date);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setCheckOut(nextDay);
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
              <Label>Check-out</Label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkOut, "PPP")}
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

          {/* Available rooms */}
          <div>
            <Label>Available Rooms</Label>
            {loadingRooms ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="animate-spin h-5 w-5 text-primary" />
              </div>
            ) : (
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length > 0 ? (
                    availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} - {room.name} (€{room.price})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No rooms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Guest search */}
          <div>
            <Label>Guest</Label>
            <Input
              placeholder="Search guest by name, phone or email"
              value={guestSearchTerm}
              onChange={(e) => {
                setGuestSearchTerm(e.target.value);
                searchGuests(e.target.value);
              }}
            />
            <Select value={selectedGuest} onValueChange={setSelectedGuest}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select or add new guest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">➕ Add new guest</SelectItem>
                {guests.map((guest) => (
                  <SelectItem key={guest.id} value={guest.id}>
                    {guest.name} — {guest.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New guest form */}
          {selectedGuest === "new" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={guestCountry} onChange={(e) => setGuestCountry(e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={guestCity} onChange={(e) => setGuestCity(e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional info..." />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Reservation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
