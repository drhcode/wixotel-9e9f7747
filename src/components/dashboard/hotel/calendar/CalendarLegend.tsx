import { Card } from "@/components/ui/card";

export const CalendarLegend = () => {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4 items-center justify-center text-xs">
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
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-xs">Cleaning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500"></div>
          <span className="text-xs">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-xs">Out of Service</span>
        </div>
      </div>
    </Card>
  );
};
