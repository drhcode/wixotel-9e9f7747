import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

interface CalendarHeaderProps {
  onNewReservation: () => void;
  onSyncIcal: () => void;
  isSyncing: boolean;
}

const AirbnbIcon = () => (
  <svg className="h-4 w-4 text-[#FF5A5F]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C9.45 0 7.41 2.01 7.41 4.5c0 2.04 1.35 3.78 3.21 4.35-.06.15-.12.3-.21.48-.3.66-3.54 7.59-3.84 8.22-.09.18-.12.36-.12.54 0 .75.6 1.35 1.35 1.35.42 0 .81-.18 1.08-.48.27-.33 3.48-6.03 3.78-6.54.09-.12.18-.27.27-.42.09.15.18.3.27.42.3.51 3.51 6.21 3.78 6.54.27.3.66.48 1.08.48.75 0 1.35-.6 1.35-1.35 0-.18-.03-.36-.12-.54-.3-.63-3.54-7.56-3.84-8.22-.09-.18-.15-.33-.21-.48 1.86-.57 3.21-2.31 3.21-4.35C16.59 2.01 14.55 0 12 0z"/>
  </svg>
);

const BookingIcon = () => (
  <svg className="h-4 w-4 text-[#003B95]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.5 9.5h-21v-2c0-1.104.896-2 2-2h17c1.104 0 2 .896 2 2v2zm-21 2h21v7.5c0 1.104-.896 2-2 2h-17c-1.104 0-2-.896-2-2v-7.5zm3 3.5c0 .552.448 1 1 1h2c.552 0 1-.448 1-1v-1c0-.552-.448-1-1-1h-2c-.552 0-1 .448-1 1v1z"/>
  </svg>
);

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
          className="w-full sm:w-auto justify-center whitespace-nowrap gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Booking & Airbnb</span>
          <div className="flex items-center gap-1 ml-1">
            <BookingIcon />
            <AirbnbIcon />
          </div>
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
