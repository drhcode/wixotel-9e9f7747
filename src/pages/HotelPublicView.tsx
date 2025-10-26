import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Mail, Phone, Bed, Users } from "lucide-react";
import { toast } from "sonner";

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  logo_url: string | null;
  amenities: string[] | null;
}

interface Room {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string | null;
  price: number;
  capacity: number;
  description: string | null;
  main_photo_url: string | null;
  square_meters: number | null;
  amenities: string[] | null;
  is_available: boolean;
}

const HotelPublicView = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotelData();
  }, [hotelSlug]);

  const fetchHotelData = async () => {
    try {
      setLoading(true);

      // Fetch hotel by slug
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("*")
        .eq("slug", hotelSlug)
        .eq("status", "active")
        .maybeSingle();

      if (hotelError) throw hotelError;
      if (!hotelData) {
        toast.error("Hotel not found");
        navigate("/");
        return;
      }

      setHotel(hotelData);

      // Fetch available rooms for this hotel
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", hotelData.id)
        .eq("is_available", true)
        .order("price", { ascending: true });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);
    } catch (error: any) {
      console.error("Error fetching hotel data:", error);
      toast.error("Failed to load hotel information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hotel) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hotel Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {hotel.logo_url && (
              <img
                src={hotel.logo_url}
                alt={hotel.name}
                className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-lg border"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{hotel.name}</h1>
              {hotel.description && (
                <p className="text-muted-foreground mb-4">{hotel.description}</p>
              )}
              <div className="space-y-2 text-sm">
                {hotel.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{hotel.address}</span>
                  </div>
                )}
                {hotel.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{hotel.phone}</span>
                  </div>
                )}
                {hotel.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{hotel.email}</span>
                  </div>
                )}
              </div>
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Section */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Available Rooms</h2>
        
        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No rooms available at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedRoom(room)}>
                {room.main_photo_url && (
                  <img
                    src={room.main_photo_url}
                    alt={room.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    {room.room_number && (
                      <Badge variant="outline">{room.room_number}</Badge>
                    )}
                  </div>
                  {room.room_type && (
                    <CardDescription>{room.room_type}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Up to {room.capacity} guests</span>
                      </div>
                      {room.square_meters && (
                        <span className="text-muted-foreground">{room.square_meters} m²</span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-auto border-t">
                    <div>
                      <div className="text-2xl font-bold">${room.price}</div>
                      <div className="text-xs text-muted-foreground">per night</div>
                    </div>
                    <Button size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedRoom(null)}>
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedRoom.main_photo_url && (
              <img
                src={selectedRoom.main_photo_url}
                alt={selectedRoom.name}
                className="w-full h-64 object-cover"
              />
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedRoom.name}</h3>
                  {selectedRoom.room_type && (
                    <p className="text-muted-foreground mt-1">{selectedRoom.room_type}</p>
                  )}
                </div>
                {selectedRoom.room_number && (
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Room {selectedRoom.room_number}
                  </Badge>
                )}
              </div>

              {selectedRoom.description && (
                <p className="text-muted-foreground">{selectedRoom.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Capacity</div>
                    <div className="font-medium">Up to {selectedRoom.capacity} guests</div>
                  </div>
                </div>
                {selectedRoom.square_meters && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Size</div>
                      <div className="font-medium">{selectedRoom.square_meters} m²</div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.amenities.map((amenity, index) => (
                      <Badge key={index} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <div className="text-3xl font-bold">${selectedRoom.price}</div>
                  <div className="text-sm text-muted-foreground">per night</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedRoom(null)}>
                    Close
                  </Button>
                  <Button>Book Now</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelPublicView;
