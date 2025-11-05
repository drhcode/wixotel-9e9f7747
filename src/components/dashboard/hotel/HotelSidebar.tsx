import { useState, useEffect } from "react";
import { LayoutDashboard, Calendar, DoorOpen, BookOpen, Users, Settings, X, UserPlus, Bell, BarChart3, MessageSquare, Link2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface HotelSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hotelId?: string;
}

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "ical", label: "Calendar Sync", icon: Link2 },
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "bookings", label: "Bookings", icon: BookOpen },
  { id: "guests", label: "Guests", icon: Users },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "earnings", label: "Earnings", icon: BarChart3 },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function HotelSidebar({ activeTab, onTabChange, hotelId }: HotelSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
    if (hotelId) {
      fetchLeadsCount();
      
      // Subscribe to leads changes with a unique channel name
      const leadsChannel = supabase
        .channel(`leads-count-${hotelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads',
            filter: `hotel_id=eq.${hotelId}`,
          },
          (payload) => {
            console.log('Leads change detected in sidebar:', payload);
            // Small delay to ensure database update is complete
            setTimeout(() => {
              fetchLeadsCount();
            }, 100);
          }
        )
        .subscribe();

      // Also listen for manual broadcasts from app flows
      const broadcastChannel = supabase
        .channel(`hotel-${hotelId}`)
        .on('broadcast', { event: 'leads_updated' }, (payload) => {
          console.log('Broadcast leads_updated received:', payload);
          fetchLeadsCount();
        })
        .subscribe();

      // Fallback: listen to notifications inserts for new leads
      const notificationsChannel = supabase
        .channel(`notifications-${hotelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `hotel_id=eq.${hotelId}`,
          },
          (payload) => {
            const newRow: any = payload.new;
            if (newRow?.type === 'new_lead') {
              console.log('New lead notification detected -> refresh leads count');
              fetchLeadsCount();
            }
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up leads subscriptions');
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(broadcastChannel);
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [hotelId]);

  const fetchLeadsCount = async () => {
    if (!hotelId) return;
    
    try {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotelId)
        .eq("is_read", false)
        .neq("status", "lost")
        .neq("status", "converted");

      if (error) throw error;
      setLeadsCount(count || 0);
    } catch (error) {
      console.error("Error fetching leads count:", error);
    }
  };

  const handleMenuClick = (tabId: string) => {
    onTabChange(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="border-r">
      {isMobile && (
        <SidebarHeader className="flex flex-row items-center justify-between border-b pb-2">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </SidebarHeader>
      )}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item.id)}
                    isActive={activeTab === item.id}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.id === "leads" && leadsCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {leadsCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
