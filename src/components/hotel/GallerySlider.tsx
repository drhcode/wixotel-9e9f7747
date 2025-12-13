import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GallerySliderProps {
  images: string[];
  hotelName: string;
}

export const GallerySlider = ({ images, hotelName }: GallerySliderProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Autoplay plugin configuration
  const autoplayOptions = {
    delay: 3000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
      containScroll: "trimSnaps",
    },
    [Autoplay(autoplayOptions)]
  );

  // Limit to 10 images max
  const displayImages = images.slice(0, 10);
  
  // Calculate slides per view based on screen size
  const slidesPerView = isMobile ? 2 : 5;
  const slideWidth = isMobile ? "calc(50% - 6px)" : "calc(20% - 10px)";

  if (!displayImages || displayImages.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Gallery</h2>
            <p className="text-muted-foreground mt-2">Explore our beautiful spaces</p>
          </div>
          
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-3">
              {displayImages.map((image, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 cursor-pointer group"
                  style={{ width: slideWidth }}
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-md">
                    <img
                      src={image}
                      alt={`${hotelName} gallery image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Full Size Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none">
          <div className="relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 md:top-2 md:right-2 z-50 p-2 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt={`${hotelName} full size`}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
