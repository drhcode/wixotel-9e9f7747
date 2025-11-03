import React, { useEffect, useRef, useState } from 'react';
// mapbox-gl is loaded dynamically to avoid module import issues

interface Hotel {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface HotelsMapProps {
  hotels: Hotel[];
}

const HotelsMap: React.FC<HotelsMapProps> = ({ hotels }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const init = async () => {
      // Get Mapbox token from environment
      const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (!mapboxToken) {
        console.error('Mapbox token not found');
        setTokenError(true);
        return;
      }

      const mod = await import('mapbox-gl');
      mapboxRef.current = mod.default;
      mapboxRef.current.accessToken = mapboxToken;

      // Initialize map
      map.current = new mapboxRef.current.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [20, 45], // Center on Europe
        zoom: 4,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxRef.current.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Enable scroll zoom
      map.current.scrollZoom.enable();
    };

    init();

    // Cleanup
    return () => {
      markers.current.forEach((marker: any) => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, []);

  // Update markers when hotels change
  useEffect(() => {
    if (!map.current || !mapboxRef.current) return;

    // Clear existing markers
    markers.current.forEach((marker: any) => marker.remove());
    markers.current = [];

    // Filter hotels with valid coordinates
    const hotelsWithCoords = hotels.filter(
      hotel => hotel.latitude && hotel.longitude
    );

    // Add markers for each hotel
    hotelsWithCoords.forEach(hotel => {
      const el = document.createElement('div');
      el.className = 'hotel-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iIzg5MDBGRiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTE1IDIwSDI1TTIwIDE1VjI1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==)';
      el.style.backgroundSize = 'contain';
      el.style.cursor = 'pointer';

      // Create popup
      const popup = new mapboxRef.current.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${hotel.name}</h3>
          <p style="margin: 0; font-size: 14px; color: #666;">
            ${hotel.city && hotel.country ? `${hotel.city}, ${hotel.country}` : 'Location not specified'}
          </p>
          <a href="/hotel/${hotel.slug}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #8900FF; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
            View Hotel
          </a>
        </div>
      `);

      const marker = new mapboxRef.current.Marker(el)
        .setLngLat([Number(hotel.longitude), Number(hotel.latitude)])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit map to show all markers if there are any
    if (hotelsWithCoords.length > 0) {
      const bounds = new mapboxRef.current.LngLatBounds();
      hotelsWithCoords.forEach(hotel => {
        bounds.extend([Number(hotel.longitude), Number(hotel.latitude)]);
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }
  }, [hotels]);

  if (tokenError) {
    return (
      <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-elegant bg-accent/20 flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-xl font-semibold mb-2">Map Configuration Needed</h3>
          <p className="text-muted-foreground">
            Mapbox token not configured. Please add VITE_MAPBOX_PUBLIC_TOKEN to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-elegant">
      <div ref={mapContainer} className="absolute inset-0" />
      <style>{`
        @import url('https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css');
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .mapboxgl-popup-close-button {
          font-size: 24px;
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
};

export default HotelsMap;
