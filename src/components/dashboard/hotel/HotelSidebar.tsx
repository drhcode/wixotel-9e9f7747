import { useState, useEffect } from "react";
import { LayoutDashboard, Calendar, DoorOpen, BookOpen, Users, Settings, X, UserPlus, BarChart3, MessageSquare, Link2, Receipt, HelpCircle } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";

interface HotelSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hotelId?: string;
}

const menuItems = [
  { id: "overview", labelKey: "dashboard.overview", fallback: "Overview", icon: LayoutDashboard },
  { id: "calendar", labelKey: "dashboard.calendar", fallback: "Calendar", icon: Calendar },
  { id: "bookings", labelKey: "dashboard.bookings", fallback: "Bookings", icon: BookOpen },
  { id: "rooms", labelKey: "dashboard.rooms", fallback: "Rooms", icon: DoorOpen },
  { id: "guests", labelKey: "dashboard.guests", fallback: "Guests", icon: Users },
  { id: "leads", labelKey: "dashboard.booking_requests", fallback: "Booking Requests", icon: UserPlus },
  { id: "earnings", labelKey: "dashboard.earnings", fallback: "Earnings", icon: BarChart3 },
  { id: "invoices", labelKey: "dashboard.invoices", fallback: "Invoices", icon: Receipt },
  { id: "ical", labelKey: "dashboard.sync", fallback: "Sync", icon: Link2 },
  { id: "support", labelKey: "dashboard.support", fallback: "Support", icon: MessageSquare },
  { id: "help", labelKey: "dashboard.help", fallback: "Help", icon: HelpCircle },
  { id: "settings", labelKey: "dashboard.settings", fallback: "Settings", icon: Settings },
];

export function HotelSidebar({ activeTab, onTabChange, hotelId }: HotelSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useLanguage();
  const [leadsCount, setLeadsCount] = useState(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState(0);

  useEffect(() => {
    if (hotelId) {
      fetchLeadsCount();
      fetchUnpaidInvoicesCount();
      
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

      // Subscribe to invoices changes
      const invoicesChannel = supabase
        .channel(`invoices-count-${hotelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `hotel_id=eq.${hotelId}`,
          },
          (payload) => {
            console.log('Invoices change detected in sidebar:', payload);
            setTimeout(() => {
              fetchUnpaidInvoicesCount();
            }, 100);
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up leads subscriptions');
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(broadcastChannel);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(invoicesChannel);
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

  const fetchUnpaidInvoicesCount = async () => {
    if (!hotelId) return;
    
    try {
      const { count, error } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotelId)
        .in("status", ["pending", "overdue"]);

      if (error) throw error;
      setUnpaidInvoicesCount(count || 0);
    } catch (error) {
      console.error("Error fetching unpaid invoices count:", error);
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
          <h2 className="text-lg font-semibold">{t('common.menu', 'Menu')}</h2>
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
              {menuItems.map((item) => {
                const label = t(item.labelKey, item.fallback);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleMenuClick(item.id)}
                      isActive={activeTab === item.id}
                      tooltip={label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{label}</span>
                      {item.id === "leads" && leadsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {leadsCount}
                        </Badge>
                      )}
                      {item.id === "invoices" && unpaidInvoicesCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {unpaidInvoicesCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
