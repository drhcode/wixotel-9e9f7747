import React, { useEffect, useRef, useState } from 'react';
// mapbox-gl is loaded dynamically to avoid module import issues

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface HotelsMapProps {
  hotels: Hotel[];
  userLocation?: { lat: number; lng: number } | null;
}

const HotelsMap: React.FC<HotelsMapProps> = ({ hotels, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const mapboxTokenRef = useRef<string | null>(null);
  const markers = useRef<any[]>([]);
  const [tokenError, setTokenError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    const init = async () => {
      try {
        // Get Mapbox token from environment
        const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
        if (!mapboxToken) {
          console.error('Mapbox token not found');
          setTokenError(true);
          setIsLoading(false);
          return;
        }

        const mod = await import('mapbox-gl');
        mapboxRef.current = mod.default;
        mapboxRef.current.accessToken = mapboxToken;
        mapboxTokenRef.current = mapboxToken;

        // Determine initial center and zoom
        const initialCenter: [number, number] = userLocation 
          ? [userLocation.lng, userLocation.lat]
          : [20, 45]; // Default to Europe
        const initialZoom = userLocation ? 12 : 3;

        // Initialize map
        map.current = new mapboxRef.current.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: true,
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

        // Wait for map to load
        map.current.on('load', () => {
          console.log('Map loaded successfully');
          setIsLoading(false);
        });

        map.current.on('error', (e: any) => {
          console.error('Map error:', e);
          setTokenError(true);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Map initialization error:', error);
        setTokenError(true);
        setIsLoading(false);
      }
    };

    init();

    // Cleanup
    return () => {
      markers.current.forEach((marker: any) => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Center map on user location when it becomes available
  useEffect(() => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 13,
      duration: 2000
    });
  }, [userLocation]);

  // Ensure map resizes correctly when container size changes
  useEffect(() => {
    if (!map.current) return;
    const handleResize = () => {
      try {
        map.current?.resize();
      } catch (e) {
        console.warn('Map resize failed:', e);
      }
    };
    // Initial resize after mount
    setTimeout(handleResize, 0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoading]);

  // Update markers when hotels change
  useEffect(() => {
    if (!map.current || !mapboxRef.current) return;

    const addMarkers = async () => {
      // Clear existing markers
      markers.current.forEach((marker: any) => marker.remove());
      markers.current = [];

      // Prefer hotels with valid coordinates
      const hotelsWithCoords = hotels.filter(hotel => hotel.latitude && hotel.longitude);
      const hotelsWithoutCoords = hotels.filter(hotel => !hotel.latitude || !hotel.longitude);

      const geocoded: { hotel: Hotel; lat: number; lng: number }[] = [];

      // Geocode hotels missing coordinates using Mapbox Geocoding API
      if (hotelsWithoutCoords.length && mapboxTokenRef.current) {
        await Promise.all(
          hotelsWithoutCoords.map(async (hotel) => {
            const parts = [hotel.address, hotel.city, hotel.country, hotel.name]
              .filter(Boolean)
              .join(', ');
            try {
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(parts)}.json?access_token=${mapboxTokenRef.current}&limit=1`
              );
              const data = await res.json();
              const feature = data?.features?.[0];
              if (feature?.center?.length === 2) {
                geocoded.push({ hotel, lng: feature.center[0], lat: feature.center[1] });
              }
            } catch (e) {
              console.warn('Geocoding failed for', hotel.name, e);
            }
          })
        );
      }

      const allMarkers = [
        ...hotelsWithCoords.map(h => ({ hotel: h, lat: Number(h.latitude), lng: Number(h.longitude) })),
        ...geocoded,
      ];

      // Add markers for each hotel
      allMarkers.forEach(({ hotel, lat, lng }) => {
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
          .setLngLat([Number(lng), Number(lat)])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.push(marker);
      });

      // Fit map to show all markers if there are any
      if (allMarkers.length > 0) {
        const bounds = new mapboxRef.current.LngLatBounds();
        allMarkers.forEach(({ lat, lng }) => bounds.extend([Number(lng), Number(lat)]));
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12,
        });
      }
    };

    addMarkers();
  }, [hotels]);

  if (tokenError) {
    return (
      <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-elegant bg-accent/20 flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-xl font-semibold mb-2">Map Configuration Needed</h3>
          <p className="text-muted-foreground">
            Map token issue. Please ensure a valid public token is configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-elegant">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/20 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
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
