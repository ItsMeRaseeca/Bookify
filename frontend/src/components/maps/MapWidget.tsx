/**
 * MapWidget Component
 * ====================
 * A compact, clickable map preview showing a service location.
 * Uses Leaflet.js with OpenStreetMap tiles.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Fix for default marker icon in Leaflet with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapWidgetProps {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  onClick?: () => void;
}

export default function MapWidget({ latitude, longitude, address, city, onClick }: MapWidgetProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add marker
    L.marker([latitude, longitude]).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  // Update map view if coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  const locationText = [address, city].filter(Boolean).join(', ') || 
    `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={onClick}
    >
      <div 
        ref={mapContainerRef} 
        className="h-40 w-full"
        style={{ zIndex: 0 }}
      />
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground truncate flex-1">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:underline shrink-0 ml-2">
            <Navigation size={12} />
            <span>Get Directions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
