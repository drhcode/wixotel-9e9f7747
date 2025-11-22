import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, addDays, isSameDay } from "date-fns";
import { RoomStatusBadge } from "./RoomStatusBadge";

interface CalendarTimelineProps {
  rooms: any[];
  timelineStartDate: Date;
  onTimelineStartDateChange: (date: Date) => void;
  TIMELINE_DAYS: number;
  getStartCellBookingForRoom: (roomId: string, date: Date) => any;
  getBookingPosition: (booking: any, date: Date) => { start: boolean; span: number };
  getStatusColor: (status: string) => string;
  onBookingClick: (booking: any) => void;
}

export const CalendarTimeline = ({
  rooms,
  timelineStartDate,
  onTimelineStartDateChange,
  TIMELINE_DAYS,
  getStartCellBookingForRoom,
  getBookingPosition,
  getStatusColor,
  onBookingClick,
}: CalendarTimelineProps) => {
  const [roomStatuses, setRoomStatuses] = useState<Record<string, string>>(
    rooms.reduce((acc, room) => ({ ...acc, [room.id]: room.status || "ready" }), {})
  );

  useEffect(() => {
    setRoomStatuses((prev) => {
      const updated = { ...prev };
      rooms.forEach((room) => {
        updated[room.id] = room.status || prev[room.id] || "ready";
      });
      return updated;
    });
  }, [rooms]);

  const handleStatusChange = (roomId: string, newStatus: string) => {
    setRoomStatuses((prev) => ({ ...prev, [roomId]: newStatus }));
  };

  const generateTimelineDates = useMemo(() => {
    const dates: Date[] = [];
    const normalizedStart = startOfDay(timelineStartDate);
    for (let i = 0; i < TIMELINE_DAYS; i++) {
      dates.push(startOfDay(addDays(normalizedStart, i)));
    }
    return dates;
  }, [timelineStartDate, TIMELINE_DAYS]);

  return (
    <div className="hidden lg:block">
      <Card className="p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="font-semibold text-lg">Timeline View</h3>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-2">
              <Select
                value={format(timelineStartDate, "M")}
                onValueChange={(value) => {
                  if (value) {
                    const newDate = startOfDay(new Date(timelineStartDate));
                    newDate.setMonth(parseInt(value) - 1);
                    onTimelineStartDateChange(newDate);
                  }
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {format(new Date(2024, i, 1), "MMMM")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={format(timelineStartDate, "yyyy")}
                onValueChange={(value) => {
                  if (value) {
                    const newDate = startOfDay(new Date(timelineStartDate));
                    newDate.setFullYear(parseInt(value));
                    onTimelineStartDateChange(newDate);
                  }
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {Array.from({ length: 11 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onTimelineStartDateChange(startOfDay(addDays(timelineStartDate, -TIMELINE_DAYS)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onTimelineStartDateChange(startOfDay(new Date()))}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onTimelineStartDateChange(startOfDay(addDays(timelineStartDate, TIMELINE_DAYS)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative rounded-lg border">
          <div className="min-w-[1400px] bg-background">
            {/* Header */}
            <div className="grid relative" style={{ gridTemplateColumns: "250px repeat(12, 1fr)" }}>
              <div className="p-4 border-b border-r font-bold text-lg bg-muted sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                Room
              </div>
              {generateTimelineDates.map((date) => {
                const isToday = isSameDay(date, new Date());
                return (
                  <div
                    key={date.toISOString()}
                    className={`p-3 border-b border-r text-center ${isToday ? "bg-primary/20" : "bg-muted/30"}`}
                  >
                    <div className={`text-xs ${isToday ? "text-primary" : "font-semibold"}`}>
                      {format(date, "EEE")}
                    </div>
                    <div className={`text-sm ${isToday ? "text-primary" : ""}`}>{format(date, "dd")}</div>
                    <div className={`text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(date, "MMM")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Rows */}
            {rooms.map((room) => {
              const renderedDateIndices = new Set<number>();

              return (
                <div
                  key={room.id}
                  className="grid relative"
                  style={{ gridTemplateColumns: "250px repeat(12, 1fr)" }}
                >
                  <div className="p-4 border-b border-r bg-background sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="text-sm font-bold flex items-center gap-2 mb-2">
                      {room.main_photo_url && (
                        <img
                          src={room.main_photo_url}
                          alt={room.name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                        />
                      )}
                      <span className="text-xs">
                        {room.room_number} {room.name}
                      </span>
                    </div>
                    <RoomStatusBadge 
                      roomId={room.id} 
                      status={roomStatuses[room.id] || room.status || "ready"}
                      onStatusChange={(newStatus) => handleStatusChange(room.id, newStatus)}
                    />
                  </div>

                  {generateTimelineDates.map((date, dateIndex) => {
                    if (renderedDateIndices.has(dateIndex)) {
                      return null;
                    }

                    const startBooking = getStartCellBookingForRoom(room.id, date);

                    if (startBooking) {
                      const position = getBookingPosition(startBooking, date);

                      for (let i = 0; i < position.span; i++) {
                        renderedDateIndices.add(dateIndex + i);
                      }

                      const gridStart = 2 + dateIndex;
                      const gridEnd = 2 + dateIndex + position.span;

                      return (
                        <div
                          key={date.toISOString()}
                          className="border-b border-r min-h-[80px] bg-background p-2 relative"
                          style={{ gridColumnStart: gridStart, gridColumnEnd: gridEnd }}
                        >
                          <div
                            className="absolute text-xs cursor-pointer hover:opacity-90 transition-all flex flex-col justify-center px-3 py-2 shadow-sm rounded-lg group"
                            style={{
                              backgroundColor: getStatusColor(startBooking.status) + "20",
                              border: "2px solid " + getStatusColor(startBooking.status),
                              color: getStatusColor(startBooking.status),
                              left: "8px",
                              right: "8px",
                              top: "8px",
                              bottom: "8px",
                            }}
                            onClick={() => onBookingClick(startBooking)}
                            title={startBooking.full_name || startBooking.guests?.name}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="font-semibold truncate">
                                {startBooking.full_name || startBooking.guests?.name}
                              </div>
                              <span 
                                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                                style={{
                                  backgroundColor: startBooking.lead_id ? "#7C3BED15" : "#16A24915",
                                  color: startBooking.lead_id ? "#7C3BED" : "#16A249",
                                  border: `1px solid ${startBooking.lead_id ? "#7C3BED40" : "#16A24940"}`
                                }}
                              >
                                {startBooking.lead_id ? "Lead" : "Direct"}
                              </span>
                            </div>
                            <div className="text-[10px] opacity-90 truncate">
                              {format(new Date(startBooking.check_in), "MMM dd")} -{" "}
                              {format(new Date(startBooking.check_out), "MMM dd")}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      renderedDateIndices.add(dateIndex);
                      return (
                        <div
                          key={date.toISOString()}
                          className="border-b border-r min-h-[80px] bg-background hover:bg-accent/30 transition-colors"
                        />
                      );
                    }
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
