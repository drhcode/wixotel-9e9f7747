import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface RoomStatusBadgeProps {
  roomId: string;
  status: string;
  onStatusChange?: (newStatus: string) => void;
}

export const ROOM_STATUSES = {
  ready: { label: "Ready", color: "bg-green-500/20 text-green-700 border-green-500" },
  dirty: { label: "Dirty", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500" },
  cleaning: { label: "Cleaning", color: "bg-blue-500/20 text-blue-700 border-blue-500" },
  maintenance: { label: "Maintenance", color: "bg-orange-500/20 text-orange-700 border-orange-500" },
  out_of_service: { label: "Out of Service", color: "bg-red-500/20 text-red-700 border-red-500" },
};

export const RoomStatusBadge = ({ roomId, status, onStatusChange }: RoomStatusBadgeProps) => {
  const currentStatus = status || "ready";
  const statusConfig = ROOM_STATUSES[currentStatus as keyof typeof ROOM_STATUSES] || ROOM_STATUSES.ready;

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ status: newStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Room status updated to {ROOM_STATUSES[newStatus as keyof typeof ROOM_STATUSES]?.label}</span>
        </div>
      );
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error("Error updating room status:", error);
      toast.error("Failed to update room status");
    }
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[140px] h-7 text-xs border-2">
        <SelectValue>
          <Badge variant="outline" className={`${statusConfig.color} text-[10px] px-2 py-0.5 font-semibold`}>
            {statusConfig.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-[150]">
        <div className="p-2 text-[10px] text-muted-foreground border-b mb-1">
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Auto-updates on checkout</span>
          </div>
        </div>
        {Object.entries(ROOM_STATUSES).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <Badge variant="outline" className={`${config.color} text-xs`}>
              {config.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
