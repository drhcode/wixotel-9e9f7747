import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CalendarBookingsListProps {
  selectedDate: Date;
  bookings: any[];
  rooms: any[];
  onBookingClick: (booking: any) => void;
  getStatusColor: (status: string) => string;
}

export const CalendarBookingsList = ({
  selectedDate,
  bookings,
  rooms,
  onBookingClick,
  getStatusColor,
}: CalendarBookingsListProps) => {
  return (
    <>
      <div className="flex items-center justify-center py-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">
          Reserved Rooms ({bookings.length}) | Free Rooms ({Math.max(0, rooms.length - bookings.length)})
        </span>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4">Bookings for {format(selectedDate, "MMM dd, yyyy")}</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No bookings for this date</p>
          ) : (
            bookings.map((booking) => {
              const room = rooms.find((r) => r.id === booking.room_id);
              return (
                <Card
                  key={booking.id}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onBookingClick(booking)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {room?.main_photo_url && (
                        <img
                          src={room.main_photo_url}
                          alt={room.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{booking.full_name || booking.guests?.name}</p>
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: booking.lead_id ? "#7C3BED15" : "#16A24915",
                              color: booking.lead_id ? "#7C3BED" : "#16A249",
                              border: `1px solid ${booking.lead_id ? "#7C3BED40" : "#16A24940"}`
                            }}
                          >
                            {booking.lead_id ? "Lead" : "Direct"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Room {booking.rooms?.room_number || booking.rooms?.name}
                        </p>
                      </div>
                    </div>
                    <Badge style={{ backgroundColor: getStatusColor(booking.status) }} className="text-white">
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(booking.check_in), "MMM dd")} -{" "}
                    {format(new Date(booking.check_out), "MMM dd, yyyy")}
                  </div>
                  <div className="text-sm font-medium mt-2">€{booking.total_amount}</div>
                </Card>
              );
            })
          )}
        </div>
      </Card>
    </>
  );
};
