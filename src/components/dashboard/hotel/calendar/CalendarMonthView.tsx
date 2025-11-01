import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

interface CalendarMonthViewProps {
  currentMonth: Date;
  selectedDate: Date;
  onCurrentMonthChange: (month: Date) => void;
  onSelectedDateChange: (date: Date) => void;
  modifiers?: Record<string, Date[]>;
  modifiersStyles?: any;
  isSafari: boolean;
}

export const CalendarMonthView = ({
  currentMonth,
  selectedDate,
  onCurrentMonthChange,
  onSelectedDateChange,
  modifiers,
  modifiersStyles,
  isSafari,
}: CalendarMonthViewProps) => {
  return (
    <div className="lg:hidden space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => onCurrentMonthChange(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onCurrentMonthChange(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Calendar
          key={isSafari ? "safari" : "default"}
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onSelectedDateChange(date);
            }
          }}
          {...(!isSafari
            ? ({
                month: currentMonth,
                onMonthChange: onCurrentMonthChange,
                modifiers: modifiers as any,
                modifiersStyles: modifiersStyles as any,
              } as any)
            : ({ month: currentMonth } as any))}
          className="w-full"
          classNames={{
            caption: "hidden",
            nav: "hidden",
            months: "flex w-full",
            month: "w-full",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "flex-1 text-center text-sm p-1 relative",
            day: "h-10 w-full p-0 font-normal aria-selected:opacity-100",
            day_selected:
              "!bg-primary !text-primary-foreground hover:!bg-primary/90 !border-primary !border-4 !font-bold !shadow-lg",
          }}
        />
      </Card>
    </div>
  );
};
