import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Hotel {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
}

interface HotelsMapProps {
  hotels: Hotel[];
  onHotelClick?: (hotelId: string) => void;
}

const HotelsMap = ({ hotels, onHotelClick }: HotelsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(true);

  useEffect(() => {
    // Check if token is stored
    const storedToken = localStorage.getItem('mapbox_token');
    if (storedToken) {
      setMapboxToken(storedToken);
      setShowTokenInput(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      // Initialize map
      mapboxgl.accessToken = mapboxToken;
      
      // Calculate center and bounds
      const hotelsWithCoords = hotels.filter(h => h.latitude && h.longitude);
      
      let center: [number, number] = [20, 41]; // Default center (Albania area)
      let zoom = 7;

      if (hotelsWithCoords.length > 0) {
        const avgLat = hotelsWithCoords.reduce((sum, h) => sum + Number(h.latitude), 0) / hotelsWithCoords.length;
        const avgLng = hotelsWithCoords.reduce((sum, h) => sum + Number(h.longitude), 0) / hotelsWithCoords.length;
        center = [avgLng, avgLat];
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Add markers for each hotel
      hotelsWithCoords.forEach((hotel) => {
        if (!hotel.latitude || !hotel.longitude) return;

        const el = document.createElement('div');
        el.className = 'hotel-marker';
        el.style.cssText = `
          background: hsl(var(--primary));
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s;
        `;
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '10';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        el.addEventListener('click', () => {
          if (onHotelClick) {
            onHotelClick(hotel.slug);
          }
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(hotel.longitude), Number(hotel.latitude)])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h3 style="font-weight: 600; margin-bottom: 4px;">${hotel.name}</h3>
                  <p style="font-size: 14px; color: #666;">${hotel.city}, ${hotel.country}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.current.push(marker);
      });

      // Fit bounds to show all hotels
      if (hotelsWithCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        hotelsWithCoords.forEach(hotel => {
          if (hotel.latitude && hotel.longitude) {
            bounds.extend([Number(hotel.longitude), Number(hotel.latitude)]);
          }
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setShowTokenInput(true);
    }

    // Cleanup
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [hotels, mapboxToken, onHotelClick]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken);
      setShowTokenInput(false);
    }
  };

  if (showTokenInput) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg p-8">
        <div className="max-w-md w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="Enter your Mapbox token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
            />
          </div>
          <button
            onClick={handleTokenSubmit}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Load Map
          </button>
          <p className="text-xs text-muted-foreground">
            Get your free token at{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default HotelsMap;
