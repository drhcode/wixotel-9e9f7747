import { Card } from "@/components/ui/card";

export const CalendarLegend = () => {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4 items-center justify-center text-xs">
        <div className="font-semibold text-sm">Booking Status:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#7C3BED" }}></div>
          <span className="text-xs">Reserved/Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#16A249" }}></div>
          <span className="text-xs">Checked In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#C06969" }}></div>
          <span className="text-xs">Checked Out</span>
        </div>
        <div className="h-4 w-px bg-border mx-2"></div>
        <div className="font-semibold text-sm">Room Status:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-xs">Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span className="text-xs">Dirty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500"></div>
          <span className="text-xs">Maintenance</span>
        </div>
      </div>
    </Card>
  );
};
