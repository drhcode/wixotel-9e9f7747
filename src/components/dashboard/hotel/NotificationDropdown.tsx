import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  hotelId: string;
}

export function NotificationDropdown({ hotelId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to all notification changes (real-time)
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `hotel_id=eq.${hotelId}`,
        },
        (payload) => {
          console.log('Notification change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Refresh to maintain pagination
            fetchNotifications();
          } else if (payload.eventType === 'UPDATE') {
            // Update existing notification
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            // Recalculate unread count
            fetchNotifications();
          } else if (payload.eventType === 'DELETE') {
            // Refresh to maintain pagination
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  useEffect(() => {
    fetchNotifications();
  }, [currentPage]);

  const fetchNotifications = async () => {
    try {
      // Get total count
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("hotel_id", hotelId);

      const total = count || 0;
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

      // Get unread count
      const { count: unreadCountResult } = await supabase
        .from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("hotel_id", hotelId)
        .eq("is_read", false);
      
      setUnreadCount(unreadCountResult || 0);

      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("hotel_id", hotelId)
        .eq("is_read", false);

      if (error) throw error;
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-7 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.is_read ? "bg-muted/50" : ""
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm">{notification.title}</span>
                  {!notification.is_read && (
                    <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(notification.created_at), "MMM dd, HH:mm")}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
