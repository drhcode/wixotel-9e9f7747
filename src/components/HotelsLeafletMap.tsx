import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Hotel {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
}

interface HotelsLeafletMapProps {
  hotels: Hotel[];
  onHotelClick?: (hotelSlug: string) => void;
}

const HotelsLeafletMap = ({ hotels, onHotelClick }: HotelsLeafletMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Filter hotels with valid coordinates
    const hotelsWithCoords = hotels.filter(h => h.latitude && h.longitude);

    // Calculate center - prioritize user location
    let center: [number, number] = [41.3275, 19.8187]; // Default center (Tirana, Albania)
    let zoom = 13; // Closer zoom level

    if (hotelsWithCoords.length > 0) {
      const avgLat = hotelsWithCoords.reduce((sum, h) => sum + Number(h.latitude), 0) / hotelsWithCoords.length;
      const avgLng = hotelsWithCoords.reduce((sum, h) => sum + Number(h.longitude), 0) / hotelsWithCoords.length;
      center = [avgLat, avgLng];
    }

    // Initialize map with closer zoom
    map.current = L.map(mapContainer.current).setView(center, zoom);

    // Add OpenStreetMap tile layer (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: hsl(var(--primary));
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Add markers for each hotel
    const markers: L.Marker[] = [];
    hotelsWithCoords.forEach((hotel) => {
      if (!hotel.latitude || !hotel.longitude) return;

      const marker = L.marker([Number(hotel.latitude), Number(hotel.longitude)], {
        icon: customIcon,
      })
        .addTo(map.current!)
        .bindPopup(`
          <div style="padding: 8px;">
            <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${hotel.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0;">${hotel.city}, ${hotel.country}</p>
          </div>
        `);

      marker.on('click', () => {
        if (onHotelClick) {
          onHotelClick(hotel.slug);
        }
      });

      markers.push(marker);
    });

    // Fit bounds to show all hotels
    if (hotelsWithCoords.length > 1) {
      const bounds = L.latLngBounds(
        hotelsWithCoords.map(h => [Number(h.latitude), Number(h.longitude)] as [number, number])
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [hotels, onHotelClick]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default HotelsLeafletMap;
