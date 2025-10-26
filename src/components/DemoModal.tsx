import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { X } from "lucide-react";
import demoCalendar from "@/assets/demo-calendar.jpg";
import demoBookings from "@/assets/demo-bookings.jpg";
import demoModal from "@/assets/demo-modal.jpg";
import demoMobile from "@/assets/demo-mobile.jpg";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const demoSlides = [
  {
    image: demoCalendar,
    title: "Advanced Calendar Management",
    description: "View all your bookings at a glance with our intuitive calendar interface"
  },
  {
    image: demoBookings,
    title: "Smart Booking Management",
    description: "Manage reservations, guest details, and room assignments effortlessly"
  },
  {
    image: demoModal,
    title: "Quick Reservation Creation",
    description: "Create new bookings in seconds with our streamlined modal forms"
  },
  {
    image: demoMobile,
    title: "Mobile-First Design",
    description: "Manage your hotel on the go with our responsive mobile interface"
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
