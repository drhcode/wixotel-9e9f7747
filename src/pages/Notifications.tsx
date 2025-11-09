import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, CheckCheck, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  hotel_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchHotelId();
  }, []);

  useEffect(() => {
    if (hotelId) {
      fetchNotifications();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('all-notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `hotel_id=eq.${hotelId}`
          },
          (payload) => {
            // Refresh data to maintain pagination
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [hotelId]);

  useEffect(() => {
    fetchNotifications();
  }, [currentPage, hotelId]);

  useEffect(() => {
    // Filter is now client-side only for the current page
    setFilteredNotifications(notifications);
  }, [notifications]);

  const fetchHotelId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: hotelData } = await supabase
      .from('hotels')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (hotelData) {
      setHotelId(hotelData.id);
    }
  };

  const fetchNotifications = async () => {
    if (!hotelId) return;
    
    try {
      setLoading(true);
      
      // Build query with search
      let countQuery = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId);

      let dataQuery = supabase
        .from('notifications')
        .select('*')
        .eq('hotel_id', hotelId);

      // Apply search filter if query exists
      if (searchQuery.trim()) {
        const search = `%${searchQuery.trim()}%`;
        countQuery = countQuery.or(`title.ilike.${search},message.ilike.${search},type.ilike.${search}`);
        dataQuery = dataQuery.or(`title.ilike.${search},message.ilike.${search},type.ilike.${search}`);
      }

      // Get total count with search
      const { count } = await countQuery;
      
      const total = count || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

      // Reset to page 1 if current page exceeds total pages
      if (currentPage > Math.ceil(total / ITEMS_PER_PAGE) && total > 0) {
        setCurrentPage(1);
        return;
      }

      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('hotel_id', hotelId)
        .eq('is_read', false);

      if (error) throw error;
      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Notification deleted');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    return <Bell className="h-5 w-5" />;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_created':
      case 'booking_accepted':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'booking_deleted':
      case 'booking_rejected':
      case 'lead_rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'new_lead':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'status_change':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-xs text-muted-foreground">
                View and manage all your notifications
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-6 py-6 max-w-5xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </span>
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchNotifications();
                }
              }}
              className="pl-10"
            />
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No notifications found matching your search' : 'No notifications yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all ${
                    !notification.is_read 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg border ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">{notification.title}</CardTitle>
                            {!notification.is_read && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {notification.message}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;