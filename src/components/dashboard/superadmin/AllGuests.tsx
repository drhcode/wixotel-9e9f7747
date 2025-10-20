import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";

const AllGuests = () => {
  const [guests, setGuests] = useState<any[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [guestBookings, setGuestBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    const filtered = guests.filter(guest =>
      guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.hotels?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGuests(filtered);
  }, [searchTerm, guests]);

  const fetchGuests = async () => {
    const { data } = await supabase
      .from('guests')
      .select(`
        *,
        hotels(name)
      `)
      .order('created_at', { ascending: false });
    setGuests(data || []);
  };

  const fetchGuestBookings = async (guestId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms(name, room_number),
        hotels(name)
      `)
      .eq('guest_id', guestId)
      .order('check_in', { ascending: false });
    setGuestBookings(data || []);
  };

  const handleRowClick = (guest: any) => {
    setSelectedGuest(guest);
    fetchGuestBookings(guest.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Guests</h2>
        <p className="text-muted-foreground">View and search all guests across hotels</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Guests List */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or hotel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Hotel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                    <TableRow 
                      key={guest.id}
                      className={`cursor-pointer hover:bg-accent ${selectedGuest?.id === guest.id ? 'bg-accent' : ''}`}
                      onClick={() => handleRowClick(guest)}
                    >
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{guest.name}</div>
                          <div className="text-muted-foreground text-xs">{guest.email}</div>
                          <div className="text-muted-foreground text-xs">{guest.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{guest.hotels?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Guest Details */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-lg">
              {selectedGuest ? `${selectedGuest.name}'s Bookings` : "Select a guest"}
            </h3>
          </CardHeader>
          <CardContent>
            {selectedGuest ? (
              <div className="space-y-4">
                <div className="space-y-2 pb-4 border-b">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Email:</div>
                    <div>{selectedGuest.email || "N/A"}</div>
                    <div className="text-muted-foreground">Phone:</div>
                    <div>{selectedGuest.phone}</div>
                    <div className="text-muted-foreground">Hotel:</div>
                    <div>{selectedGuest.hotels?.name}</div>
                    <div className="text-muted-foreground">ID Number:</div>
                    <div>{selectedGuest.id_number || "N/A"}</div>
                  </div>
                  {selectedGuest.preferences && (
                    <div className="pt-2">
                      <div className="text-sm text-muted-foreground">Preferences:</div>
                      <div className="text-sm">{selectedGuest.preferences}</div>
                    </div>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  <h4 className="font-medium mb-3">Booking History</h4>
                  {guestBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bookings found</p>
                  ) : (
                    <div className="space-y-3">
                      {guestBookings.map((booking) => (
                        <Card key={booking.id} className="p-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{booking.hotels?.name}</div>
                                <div className="text-muted-foreground">
                                  Room {booking.rooms?.room_number || booking.rooms?.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">€{booking.total_amount}</div>
                                <div className="text-xs text-muted-foreground">{booking.status}</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(booking.check_in), 'MMM dd, yyyy')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click on a guest to view their details and booking history
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllGuests;
