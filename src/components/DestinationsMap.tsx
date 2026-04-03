import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Destination } from '../types';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DestinationsMapProps {
  destinations: Destination[];
  selectedDestination: Destination | null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 10, {
      animate: true,
      duration: 1
    });
  }, [center, map]);
  return null;
}

export default function DestinationsMap({ destinations, selectedDestination }: DestinationsMapProps) {
  const validDestinations = destinations.filter(d => d.lat !== undefined && d.lng !== undefined);
  
  // Default center (Egypt)
  const defaultCenter: [number, number] = [26.8206, 30.8025];
  const center: [number, number] = selectedDestination?.lat && selectedDestination?.lng 
    ? [selectedDestination.lat, selectedDestination.lng] 
    : defaultCenter;

  return (
    <div className="h-[500px] w-full rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative z-10">
      <MapContainer 
        center={center} 
        zoom={6} 
        style={{ height: '100%', width: '100%', background: '#111' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {validDestinations.map((dest) => (
          <Marker 
            key={dest.id} 
            position={[dest.lat!, dest.lng!]}
          >
            <Popup>
              <div className="text-black p-2">
                <h3 className="font-black text-lg">{dest.name}</h3>
                <p className="text-xs font-bold text-emerald-600">{dest.count}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {selectedDestination?.lat && selectedDestination?.lng && (
          <ChangeView center={[selectedDestination.lat, selectedDestination.lng]} />
        )}
      </MapContainer>
    </div>
  );
}
