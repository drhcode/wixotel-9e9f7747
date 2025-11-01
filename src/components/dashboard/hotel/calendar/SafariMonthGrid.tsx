import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SafariMonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onCurrentMonthChange: (month: Date) => void;
  onSelectedDateChange: (date: Date) => void;
}

// Minimal month grid for Safari to avoid react-day-picker recursion issues
export function SafariMonthGrid({
  currentMonth,
  selectedDate,
  onCurrentMonthChange,
  onSelectedDateChange,
}: SafariMonthGridProps) {
  const first = startOfMonth(currentMonth);
  const last = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: first, end: last });
  const startIndex = getDay(first); // 0 = Sun

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(startIndex).fill(null);
  days.forEach((d) => {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onCurrentMonthChange(addMonths(currentMonth, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onCurrentMonthChange(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 text-center text-[0.8rem] text-muted-foreground">
          {dow.map((d) => (
            <div key={d} className="font-normal">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {weeks.map((w, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {w.map((d, j) => {
                if (!d) return <div key={j} className="h-10" />;
                const selected = isSameDay(d, selectedDate);
                return (
                  <button
                    key={j}
                    onClick={() => {
                      if (!isSameDay(d, selectedDate)) onSelectedDateChange(d);
                    }}
                    className={
                      "h-10 w-full rounded-md border transition-colors " +
                      (selected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow"
                        : "bg-background hover:bg-accent/60")
                    }
                    aria-label={format(d, "PPPP")}
                  >
                    <span className="text-sm">{format(d, "d")}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
