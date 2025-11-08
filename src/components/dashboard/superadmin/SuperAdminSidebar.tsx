import { LayoutDashboard, Building2, CreditCard, Users, BookOpen, UserCog, Mail, X, MessageSquare, Star, DollarSign, XCircle, Receipt, Settings, Database } from "lucide-react";
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

interface SuperAdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "hotels", label: "Hotels", icon: Building2 },
  { id: "earnings", label: "Earnings", icon: DollarSign },
  { id: "plans", label: "Plans", icon: CreditCard },
  { id: "subscriptions", label: "Subscriptions", icon: UserCog },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "reservations", label: "Reservations", icon: BookOpen },
  { id: "guests", label: "Guests", icon: Users },
  { id: "cancellations", label: "Cancellation Requests", icon: XCircle },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "smtp", label: "Email Settings", icon: Mail },
  { id: "backups", label: "Database Backups", icon: Database },
  { id: "settings", label: "Settings", icon: Settings },
];

export function SuperAdminSidebar({ activeTab, onTabChange }: SuperAdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

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
