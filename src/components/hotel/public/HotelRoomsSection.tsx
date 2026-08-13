import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bed, Home, Users } from "lucide-react";
import { cleanRoomName, type PublicRoom } from "./types";

interface HotelRoomsSectionProps {
  rooms: PublicRoom[];
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  selectedCapacity: string;
  onSelectedCapacityChange: (capacity: string) => void;
  onSelectRoom: (room: PublicRoom) => void;
}

export const HotelRoomsSection = ({
  rooms,
  priceRange,
  onPriceRangeChange,
  selectedCapacity,
  onSelectedCapacityChange,
  onSelectRoom,
}: HotelRoomsSectionProps) => {
  const visibleRooms = rooms.filter((room) => {
    const inPriceRange = room.price >= priceRange[0] && room.price <= priceRange[1];
    const matchesCapacity = selectedCapacity === "all" || room.capacity === parseInt(selectedCapacity);
    return inPriceRange && matchesCapacity;
  });

  return (
    <section id="rooms" className="py-16 px-4 scroll-mt-16">
      <div className="container mx-auto">
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <h2 className="text-4xl font-bold tracking-tight">Our Rooms</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover comfort and luxury in every room
          </p>
        </div>

        {/* Filters */}
        {rooms.length > 0 && (
          <Card className="mb-8 border-border/50 shadow-md">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Price Range</Label>
                    <span className="text-sm text-muted-foreground">
                      €{priceRange[0]} - €{priceRange[1]}
                    </span>
                  </div>
                  <Slider
                    min={Math.min(...rooms.map((r) => r.price))}
                    max={Math.max(...rooms.map((r) => r.price))}
                    step={10}
                    value={priceRange}
                    onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Guest Capacity</Label>
                  <Select value={selectedCapacity} onValueChange={onSelectedCapacityChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any capacity</SelectItem>
                      {Array.from(new Set(rooms.map((r) => r.capacity)))
                        .sort((a, b) => a - b)
                        .map((capacity) => (
                          <SelectItem key={capacity} value={capacity.toString()}>
                            {capacity} {capacity === 1 ? "guest" : "guests"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {rooms.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              No rooms available at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleRooms.map((room, index) => (
              <Card
                key={room.id}
                className="group overflow-hidden hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onSelectRoom(room)}
              >
                <div className="relative overflow-hidden">
                  {room.main_photo_url ? (
                    <img
                      src={room.main_photo_url}
                      alt={cleanRoomName(room.name)}
                      className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Bed className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {room.room_number && (
                    <Badge className="absolute top-4 right-4 bg-background/90 backdrop-blur">
                      {room.room_number}
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {cleanRoomName(room.name)}
                  </CardTitle>
                  {room.room_type && <CardDescription className="text-base">{room.room_type}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{room.capacity} guests</span>
                      </div>
                      {room.square_meters && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <span>{room.square_meters} m²</span>
                        </div>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div>
                      <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        €{room.price}
                      </div>
                      <div className="text-xs text-muted-foreground">per night</div>
                    </div>
                    <Button size="sm" className="group-hover:bg-gradient-primary transition-all">
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
