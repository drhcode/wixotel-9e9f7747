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
    let zoom = 15; // Much closer zoom level

    if (hotelsWithCoords.length > 0) {
      const avgLat = hotelsWithCoords.reduce((sum, h) => sum + Number(h.latitude), 0) / hotelsWithCoords.length;
      const avgLng = hotelsWithCoords.reduce((sum, h) => sum + Number(h.longitude), 0) / hotelsWithCoords.length;
      center = [avgLat, avgLng];
    }

    // Initialize map with much closer zoom
    map.current = L.map(mapContainer.current).setView(center, zoom);

    // Add OpenStreetMap tile layer (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add custom CSS for markers with labels
    const style = document.createElement('style');
    style.textContent = `
      .hotel-marker-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .hotel-marker-pin {
        background: hsl(var(--primary));
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.2s;
      }
      .hotel-marker-pin:hover {
        transform: scale(1.3);
        z-index: 1000;
      }
      .hotel-marker-label {
        background: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        margin-top: 2px;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);

    // Add markers for each hotel with names
    const markers: L.Marker[] = [];
    hotelsWithCoords.forEach((hotel) => {
      if (!hotel.latitude || !hotel.longitude) return;

      // Create custom marker with hotel name
      const customIcon = L.divIcon({
        className: 'custom-hotel-marker',
        html: `
          <div class="hotel-marker-container">
            <div class="hotel-marker-pin"></div>
            <div class="hotel-marker-label">${hotel.name}</div>
          </div>
        `,
        iconSize: [100, 40],
        iconAnchor: [50, 20],
      });

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

    // Fit bounds to show all hotels if multiple exist in area
    if (hotelsWithCoords.length > 1) {
      const bounds = L.latLngBounds(
        hotelsWithCoords.map(h => [Number(h.latitude), Number(h.longitude)] as [number, number])
      );
      map.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    }

    // Cleanup
    return () => {
      markers.forEach(marker => marker.remove());
      map.current?.remove();
      // Remove custom styles
      const styles = document.querySelectorAll('style');
      styles.forEach(s => {
        if (s.textContent?.includes('hotel-marker-container')) {
          s.remove();
        }
      });
    };
  }, [hotels, onHotelClick]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default HotelsLeafletMap;
