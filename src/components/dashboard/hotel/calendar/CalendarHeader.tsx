import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CalendarHeaderProps {
  onNewReservation: () => void;
}

export const CalendarHeader = ({ onNewReservation }: CalendarHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold">Reservation Calendar</h2>
        <p className="text-muted-foreground text-sm">Manage your hotel bookings</p>
      </div>
      <Button onClick={onNewReservation} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        New Reservation
      </Button>
    </div>
  );
};
