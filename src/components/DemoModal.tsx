import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { X } from "lucide-react";
import demoCalendarTimeline from "@/assets/demo-calendar-timeline.png";
import demoNewReservation from "@/assets/demo-new-reservation.png";
import demoBookingsList from "@/assets/demo-bookings-list.png";
import demoMobileCalendar from "@/assets/demo-mobile-calendar.png";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const demoSlides = [
  {
    image: demoCalendarTimeline,
    title: "Reservation Calendar - Timeline View",
    description: "Visualize room availability and bookings with an intuitive timeline showing all reservations at a glance"
  },
  {
    image: demoBookingsList,
    title: "All Bookings Management",
    description: "Search and manage all reservations with detailed guest information, dates, and booking status"
  },
  {
    image: demoNewReservation,
    title: "Quick Reservation Creation",
    description: "Create new bookings in seconds with our streamlined form including guest search and room selection"
  },
  {
    image: demoMobileCalendar,
    title: "Mobile Calendar View",
    description: "Manage your hotel bookings on the go with our fully responsive mobile calendar interface"
  }
];

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden border-border/50">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              {demoSlides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="relative">
                    <div className="aspect-video w-full overflow-hidden bg-accent">
                      <img 
                        src={slide.image} 
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-8 text-white">
                      <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
                      <p className="text-base opacity-90">{slide.description}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
