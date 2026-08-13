import { Button } from "@/components/ui/button";
import type { PublicHotel } from "./types";

interface HotelHeroSectionProps {
  hotel: PublicHotel;
  onExploreRooms: () => void;
}

export const HotelHeroSection = ({ hotel, onExploreRooms }: HotelHeroSectionProps) => {
  return (
    <section className="relative h-[60vh] sm:h-[70vh] lg:h-[80vh] min-h-[500px] sm:min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        {hotel.about_us_image ? (
          <>
            <img src={hotel.about_us_image} alt={hotel.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/75 to-background/95 sm:from-background/80 sm:via-background/60 sm:to-background/90" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/30" />
        )}
      </div>

      {/* Hero Content */}
      <div className="container mx-auto px-4 relative z-10 text-center space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground drop-shadow-lg leading-tight">
          Welcome to <br className="sm:hidden" />
          <span className="bg-gradient-primary bg-clip-text text-transparent">{hotel.name}</span>
        </h1>
        {hotel.description && (
          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-foreground/90 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed drop-shadow line-clamp-3 sm:line-clamp-none px-4">
            {hotel.description}
          </p>
        )}
        <div className="pt-2 sm:pt-4">
          <Button
            size="lg"
            onClick={onExploreRooms}
            className="bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-glow hover:scale-105 transition-all text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-auto"
          >
            Explore Our Rooms
          </Button>
        </div>
      </div>
    </section>
  );
};
