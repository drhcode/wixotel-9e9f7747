import { Card } from "@/components/ui/card";

export const CalendarLegend = () => {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-6 items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#7C3BED" }}></div>
          <span className="text-sm font-medium">Reserved/Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#16A249" }}></div>
          <span className="text-sm font-medium">Checked In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#C06969" }}></div>
          <span className="text-sm font-medium">Checked Out</span>
        </div>
      </div>
    </Card>
  );
};
