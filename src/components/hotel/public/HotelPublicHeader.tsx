import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search } from "lucide-react";

interface HotelPublicHeaderProps {
  hotelName: string;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  onNavigate: (sectionId: string) => void;
  onFindBooking: () => void;
  onLogoClick: () => void;
}

const NAV_ITEMS = [
  { id: "rooms", label: "Rooms" },
  { id: "about", label: "About Us" },
  { id: "reviews", label: "Reviews" },
  { id: "contact", label: "Contact Us" },
];

export const HotelPublicHeader = ({
  hotelName,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  onNavigate,
  onFindBooking,
  onLogoClick,
}: HotelPublicHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="flex flex-col items-start leading-none">
              <span className="text-xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                {hotelName}
              </span>
              <span className="text-[9px] text-muted-foreground -mt-0.5">by wixotel</span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={onFindBooking}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find Booking
            </Button>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onFindBooking}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Find Booking</span>
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col gap-6 mt-8">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="text-lg font-medium hover:text-primary transition-colors text-left"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
