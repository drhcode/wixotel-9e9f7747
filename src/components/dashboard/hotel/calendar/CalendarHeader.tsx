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
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button 
          onClick={onSyncIcal} 
          variant="outline" 
          disabled={isSyncing}
          className="w-full sm:w-auto justify-center whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 mr-2 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Booking & Airbnb</span>
        </Button>
        <Button onClick={onNewReservation} className="w-full sm:w-auto whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="hidden sm:inline">New Reservation</span>
          <span className="sm:hidden">New Booking</span>
        </Button>
      </div>
    </div>
  );
};
