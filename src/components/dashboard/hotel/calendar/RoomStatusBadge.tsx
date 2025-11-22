import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, Loader2, Wrench, AlertCircle, XCircle } from "lucide-react";

interface RoomStatusBadgeProps {
  roomId: string;
  status: string;
  onStatusChange?: (newStatus: string) => void;
}

export const ROOM_STATUSES = {
  ready: { 
    label: "Ready", 
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    icon: CheckCircle2
  },
  dirty: { 
    label: "Dirty", 
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    icon: AlertCircle
  },
  maintenance: { 
    label: "Maintenance", 
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    icon: Wrench
  },
} as const;

export const RoomStatusBadge = ({ roomId, status, onStatusChange }: RoomStatusBadgeProps) => {
  const currentStatus = status || "ready";
  const statusConfig = ROOM_STATUSES[currentStatus as keyof typeof ROOM_STATUSES] || ROOM_STATUSES.ready;
  const StatusIcon = statusConfig.icon;

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
      <SelectTrigger className="w-[160px] h-9 border-2 hover:border-primary/50 transition-all duration-200 bg-gradient-to-r from-background to-muted/20">
        <SelectValue>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <Badge variant="outline" className={`${statusConfig.color} text-xs px-2.5 py-0.5 font-medium border-2`}>
              {statusConfig.label}
            </Badge>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background border-2 shadow-lg z-[150] min-w-[200px]">
        <div className="p-3 text-xs text-muted-foreground border-b bg-muted/30 mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-medium">Auto-updates on checkout</span>
          </div>
        </div>
        <div className="p-1">
          {Object.entries(ROOM_STATUSES).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <SelectItem 
                key={key} 
                value={key}
                className="cursor-pointer hover:bg-muted/50 my-1 rounded-md"
              >
                <div className="flex items-center gap-3 py-1">
                  <Icon className="h-4 w-4" />
                  <Badge variant="outline" className={`${config.color} text-xs font-medium border-2 px-3 py-1`}>
                    {config.label}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </div>
      </SelectContent>
    </Select>
  );
};
