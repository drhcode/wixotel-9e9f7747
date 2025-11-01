import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface HotelsMapProps {
  hotels: Hotel[];
  onHotelClick?: (slug: string) => void;
}

// Custom marker icon
const hotelIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const HotelsMap = ({ hotels, onHotelClick }: HotelsMapProps) => {
  const hotelsWithCoordinates = hotels.filter(h => h.latitude && h.longitude);
  
  // Calculate center based on hotels
  const center = hotelsWithCoordinates.length > 0
    ? [
        hotelsWithCoordinates.reduce((sum, h) => sum + (h.latitude || 0), 0) / hotelsWithCoordinates.length,
        hotelsWithCoordinates.reduce((sum, h) => sum + (h.longitude || 0), 0) / hotelsWithCoordinates.length
      ] as [number, number]
    : [41.3275, 19.8187] as [number, number]; // Default to Tirana, Albania

  return (
    <MapContainer
      center={center}
      zoom={hotelsWithCoordinates.length === 1 ? 13 : 6}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotelsWithCoordinates.map((hotel) => (
        <Marker
          key={hotel.id}
          position={[hotel.latitude!, hotel.longitude!]}
          icon={hotelIcon}
          eventHandlers={{
            click: () => {
              if (onHotelClick) {
                onHotelClick(hotel.slug);
              }
            },
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-base mb-1">{hotel.name}</h3>
              <p className="text-sm text-muted-foreground">{hotel.address}</p>
              {hotel.city && <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.country}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
