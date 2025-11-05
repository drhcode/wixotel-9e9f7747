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
  phone: z.string().trim().max(30, "Phone too long").optional(),
  email: z.union([z.string().email("Invalid email").max(255, "Email too long"), z.literal("")]).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  guestCount: z.number().min(1, "At least 1 guest required").optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  totalPrice: z.number().nonnegative("Total price must be positive").optional(),
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
  const [phonePrefix, setPhonePrefix] = useState("+1");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestCount, setGuestCount] = useState(1);
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

  // Update cities when country changes
  useEffect(() => {
    if (guestCountry) {
      const cities = getCitiesForCountry(guestCountry);
      setAvailableCities(cities);
      // Reset city if current selection is not in new country
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
      .from('guests')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(9);
    setGuests(data || []);
  };

  const searchGuests = async (term: string) => {
    if (!term.trim()) {
      fetchGuests();
      return;
    }
    
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('hotel_id', hotelId)
      .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('created_at', { ascending: false });
    setGuests(data || []);
  };

  const fetchAvailableRooms = async () => {
    // Normalize to start of day to avoid any TZ/time component issues
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const ci = normalize(checkIn);
    const co = normalize(checkOut);

    const { data, error } = await supabase.rpc('get_available_rooms', {
      p_hotel_id: hotelId,
      p_check_in: format(ci, 'yyyy-MM-dd'),
      p_check_out: format(co, 'yyyy-MM-dd')
    });
    
    if (!error) {
      setAvailableRooms(data || []);
      // If current selected room is no longer available for the chosen dates, clear it
      if (selectedRoom && !(data || []).some((r: any) => r.id === selectedRoom)) {
        setSelectedRoom("");
      }
    }
  };

  // Calculate nights and auto-update price
  useEffect(() => {
    if (selectedRoom && checkIn && checkOut) {
      const room = availableRooms.find(r => r.id === selectedRoom);
      if (room) {
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        setTotalPrice(room.price * nights);
      }
    }
  }, [selectedRoom, checkIn, checkOut, availableRooms]);
  const handleSubmit = async () => {
    // Validate minimum 1 night stay
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
    
    setLoading(true);
    setValidationErrors({});
    
    try {
      let guestId = selectedGuest;

      // If "new" is selected or no guest selected, create a new guest
      if (selectedGuest === 'new' || !selectedGuest) {
        // Validate required fields
        const newGuestPhone = guestPhone?.trim() ? `${phonePrefix}${guestPhone}` : undefined;
        const validation = guestSchema.safeParse({
          fullName: guestName,
          phone: newGuestPhone,
          email: guestEmail || undefined,
          country: guestCountry || undefined,
          city: guestCity || undefined,
          guestCount: guestCount || 1,
          notes: notes || undefined,
          totalPrice: totalPrice || 0,
        });

        if (!validation.success) {
          const errors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0] as string] = err.message;
            }
          });
          setValidationErrors(errors);
          toast.error("Please fill all required fields correctly");
          setLoading(false);
          return;
        }

        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({ 
            hotel_id: hotelId, 
            name: guestName, 
            phone: newGuestPhone || null, 
            email: guestEmail || null,
            country: guestCountry || null,
            city: guestCity || null,
            address: guestAddress || null
          })
          .select()
          .single();

        if (guestError) throw guestError;
        guestId = newGuest.id;
      }

      const room = availableRooms.find(r => r.id === selectedRoom);
      const existingGuest = guests.find(g => g.id === guestId);

      // Normalize dates before saving
      const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const ci = normalize(checkIn);
      const co = normalize(checkOut);
      
      // Generate unique confirmation number
      const confirmationNumber = `wixo${Date.now()}${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
      
      const fullPhone = guestPhone ? `${phonePrefix}${guestPhone}` : "";
      const { error } = await supabase.from('bookings').insert({
        hotel_id: hotelId,
        room_id: selectedRoom,
        guest_id: guestId,
        full_name: guestName || existingGuest?.name,
        guest_phone: fullPhone || existingGuest?.phone || null,
        guest_email: guestEmail || existingGuest?.email || null,
        check_in: format(ci, 'yyyy-MM-dd'),
        check_out: format(co, 'yyyy-MM-dd'),
        total_amount: totalPrice || 0,
        guest_count: guestCount || 1,
        notes: notes || null,
        status: 'reserved',
        confirmation_number: confirmationNumber
      });
      if (error) throw error;
      
      
      // Send booking confirmation email to guest if email is provided via Edge Function
      const finalEmail = guestEmail || existingGuest?.email;
      if (finalEmail) {
        try {
          // Fetch hotel data for email template
          const { data: hotelData } = await supabase
            .from('hotels')
            .select('name, email, phone, address, city, country')
            .eq('id', hotelId)
            .single();

          if (hotelData) {
            const { createBookingConfirmationEmail } = await import('@/lib/emailTemplates');
            const htmlContent = createBookingConfirmationEmail({
              guestName: guestName || existingGuest?.name || 'Guest',
              roomName: room?.name || 'Room',
              checkIn: format(ci, 'PPP'),
              checkOut: format(co, 'PPP'),
              totalAmount: totalPrice,
              confirmationNumber: confirmationNumber,
              hotel: hotelData,
            });

            await supabase.functions.invoke('send-email', {
              body: {
                hotel_id: hotelId,
                recipient_email: finalEmail,
                subject: `Booking Confirmation - ${hotelData.name}`,
                email_type: 'booking_confirmation',
                html_content: htmlContent,
              },
            });
          }
        } catch (emailErr) {
          console.error('Error invoking send-email:', emailErr);
        }
      }
      
      toast.success("Reservation created and guest notified");
      
      // Reset form
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      
      setCheckIn(tomorrow);
      setCheckOut(dayAfter);
      setSelectedRoom("");
      setSelectedGuest("");
      setGuestName("");
      setPhonePrefix("+1");
      setGuestEmail("");
      setGuestPhone("");
      setGuestCountry("");
      setGuestCity("");
      setGuestAddress("");
      setGuestCount(1);
      setNotes("");
      setTotalPrice(0);
      
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in</Label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkIn, 'MMM dd, yyyy')}
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
              <Label>Check-out</Label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(checkOut, 'MMM dd, yyyy')}
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

          <div>
            <Label>Available Rooms</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.room_number || room.name} - €{room.price}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoom && (
              <p className="text-sm text-muted-foreground mt-1">
                Room price: €{availableRooms.find(r => r.id === selectedRoom)?.price}/night
              </p>
            )}
          </div>

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
                  {guests.map(guest => (
                    <SelectItem key={guest.id} value={guest.id}>{guest.name}</SelectItem>
                  ))}
                  {guests.length === 0 && guestSearchTerm && (
                    <div className="text-sm text-muted-foreground p-2">No guests found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(!selectedGuest || selectedGuest === 'new') && (
            <>
              <div>
                <Label>Full Name *</Label>
                <Input 
                  value={guestName} 
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setValidationErrors(prev => ({ ...prev, fullName: "" }));
                  }}
                  className={validationErrors.fullName ? "border-destructive" : ""}
                />
                {validationErrors.fullName && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.fullName}</p>
                )}
              </div>
              <div>
                <Label>Phone</Label>
                <div className="flex gap-2">
                  <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Prefix" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+39">🇮🇹 +39</SelectItem>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+351">🇵🇹 +351</SelectItem>
                      <SelectItem value="+31">🇳🇱 +31</SelectItem>
                      <SelectItem value="+32">🇧🇪 +32</SelectItem>
                      <SelectItem value="+41">🇨🇭 +41</SelectItem>
                      <SelectItem value="+43">🇦🇹 +43</SelectItem>
                      <SelectItem value="+45">🇩🇰 +45</SelectItem>
                      <SelectItem value="+46">🇸🇪 +46</SelectItem>
                      <SelectItem value="+47">🇳🇴 +47</SelectItem>
                      <SelectItem value="+358">🇫🇮 +358</SelectItem>
                      <SelectItem value="+353">🇮🇪 +353</SelectItem>
                      <SelectItem value="+30">🇬🇷 +30</SelectItem>
                      <SelectItem value="+420">🇨🇿 +420</SelectItem>
                      <SelectItem value="+48">🇵🇱 +48</SelectItem>
                      <SelectItem value="+36">🇭🇺 +36</SelectItem>
                      <SelectItem value="+40">🇷🇴 +40</SelectItem>
                      <SelectItem value="+359">🇧🇬 +359</SelectItem>
                      <SelectItem value="+385">🇭🇷 +385</SelectItem>
                      <SelectItem value="+386">🇸🇮 +386</SelectItem>
                      <SelectItem value="+421">🇸🇰 +421</SelectItem>
                      <SelectItem value="+372">🇪🇪 +372</SelectItem>
                      <SelectItem value="+371">🇱🇻 +371</SelectItem>
                      <SelectItem value="+370">🇱🇹 +370</SelectItem>
                      <SelectItem value="+7">🇷🇺 +7</SelectItem>
                      <SelectItem value="+380">🇺🇦 +380</SelectItem>
                      <SelectItem value="+90">🇹🇷 +90</SelectItem>
                      <SelectItem value="+971">🇦🇪 +971</SelectItem>
                      <SelectItem value="+966">🇸🇦 +966</SelectItem>
                      <SelectItem value="+20">🇪🇬 +20</SelectItem>
                      <SelectItem value="+27">🇿🇦 +27</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91</SelectItem>
                      <SelectItem value="+86">🇨🇳 +86</SelectItem>
                      <SelectItem value="+81">🇯🇵 +81</SelectItem>
                      <SelectItem value="+82">🇰🇷 +82</SelectItem>
                      <SelectItem value="+852">🇭🇰 +852</SelectItem>
                      <SelectItem value="+65">🇸🇬 +65</SelectItem>
                      <SelectItem value="+60">🇲🇾 +60</SelectItem>
                      <SelectItem value="+66">🇹🇭 +66</SelectItem>
                      <SelectItem value="+84">🇻🇳 +84</SelectItem>
                      <SelectItem value="+63">🇵🇭 +63</SelectItem>
                      <SelectItem value="+62">🇮🇩 +62</SelectItem>
                      <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      <SelectItem value="+64">🇳🇿 +64</SelectItem>
                      <SelectItem value="+55">🇧🇷 +55</SelectItem>
                      <SelectItem value="+52">🇲🇽 +52</SelectItem>
                      <SelectItem value="+54">🇦🇷 +54</SelectItem>
                      <SelectItem value="+56">🇨🇱 +56</SelectItem>
                      <SelectItem value="+57">🇨🇴 +57</SelectItem>
                      <SelectItem value="+51">🇵🇪 +51</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="tel"
                    placeholder="123456789"
                    value={guestPhone} 
                    onChange={(e) => {
                      setGuestPhone(e.target.value.replace(/[^0-9]/g, ''));
                      setValidationErrors(prev => ({ ...prev, phone: "" }));
                    }}
                    className={`flex-1 ${validationErrors.phone ? "border-destructive" : ""}`}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.phone}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="guest@example.com"
                  value={guestEmail} 
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Country</Label>
                  <Select 
                    value={guestCountry} 
                    onValueChange={(value) => {
                      setGuestCountry(value);
                      setValidationErrors(prev => ({ ...prev, country: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100] max-h-[300px]">
                      {getCountries().map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City</Label>
                  <Select 
                    value={guestCity} 
                    onValueChange={(value) => {
                      setGuestCity(value);
                      setValidationErrors(prev => ({ ...prev, city: "" }));
                    }}
                    disabled={!guestCountry || availableCities.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!guestCountry ? "Select country first" : "Select city"} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100] max-h-[300px]">
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <Label>Number of Guests</Label>
            <Input 
              type="number" 
              min="1" 
              value={guestCount} 
              onChange={(e) => {
                const val = e.target.value;
                setGuestCount(val === '' ? 1 : parseInt(val) || 1);
                setValidationErrors(prev => ({ ...prev, guestCount: "" }));
              }}
              onFocus={(e) => e.target.select()}
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
              placeholder="Auto-calculated"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Auto-calculated based on nights. You can adjust for custom rates.
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading || !selectedRoom}>
              {loading ? "Creating..." : "Create Reservation"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
