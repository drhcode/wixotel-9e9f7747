import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

interface CalendarHeaderProps {
  onNewReservation: () => void;
  onSyncIcal: () => void;
  isSyncing: boolean;
}

export const CalendarHeader = ({ onNewReservation, onSyncIcal, isSyncing }: CalendarHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold">Reservation Calendar</h2>
        <p className="text-muted-foreground text-sm">Manage your hotel bookings</p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button 
          onClick={onSyncIcal} 
          variant="outline" 
          disabled={isSyncing}
          className="flex-1 sm:flex-initial"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Airbnb & Booking
        </Button>
        <Button onClick={onNewReservation} className="flex-1 sm:flex-initial">
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>
    </div>
  );
};
