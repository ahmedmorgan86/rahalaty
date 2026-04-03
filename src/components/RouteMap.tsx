import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';

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

interface RouteMapProps {
  origin: [number, number];
  destination: [number, number];
  originName: string;
  destinationName: string;
  className?: string;
}

function RoutingMachine({ origin, destination, onRouteFound }: { 
  origin: [number, number], 
  destination: [number, number],
  onRouteFound: (summary: any) => void 
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(origin[0], origin[1]),
        L.latLng(destination[0], destination[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, // Hide the default instructions panel
      lineOptions: {
        styles: [{ color: '#10b981', weight: 6, opacity: 0.8 }]
      },
      createMarker: (i: number, waypoint: any) => {
        return L.marker(waypoint.latLng, {
          icon: DefaultIcon
        });
      }
    }).addTo(map);

    routingControl.on('routesfound', (e: any) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      onRouteFound(summary);
    });

    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, origin, destination]);

  return null;
}

export default function RouteMap({ origin, destination, originName, destinationName, className }: RouteMapProps) {
  const [routeSummary, setRouteSummary] = useState<{ totalDistance: number, totalTime: number } | null>(null);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)} كم`;
  };

  return (
    <div className={cn("relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl", className)}>
      <div className="h-[400px] w-full z-10">
        <MapContainer 
          center={origin} 
          zoom={7} 
          style={{ height: '100%', width: '100%', background: '#111' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <RoutingMachine 
            origin={origin} 
            destination={destination} 
            onRouteFound={setRouteSummary} 
          />
        </MapContainer>
      </div>

      {routeSummary && (
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">المسافة الإجمالية</p>
                <p className="text-xl font-black text-white">{formatDistance(routeSummary.totalDistance)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الوقت المتوقع</p>
                <p className="text-xl font-black text-white">{formatTime(routeSummary.totalTime)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الوجهة</p>
                <p className="text-xl font-black text-white">{destinationName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
