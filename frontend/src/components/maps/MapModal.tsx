/**
 * MapModal Component
 * ===================
 * Full-screen modal with route planning functionality.
 * User can enter their location and get directions to the service.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Loader2, Clock, Route } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || '';

interface AutocompleteResult {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
  };
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };
}

export default function MapModal({ isOpen, onClose, destination }: MapModalProps) {
  const [startLocation, setStartLocation] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Leaflet dynamically and initialize map
  useEffect(() => {
    if (!isOpen) return;

    let L: any;
    let map: any;
    let mounted = true;

    const initMap = async () => {
      // Dynamic import of Leaflet
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      L = leaflet.default;

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 150));

      if (!mounted || !mapContainerRef.current) return;

      // Clean up existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Check if container already has a map
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      // Create map
      map = L.map(mapContainerRef.current, {
        center: [destination.latitude, destination.longitude],
        zoom: 15,
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Add destination marker (simple default marker)
      const destMarker = L.marker([destination.latitude, destination.longitude]).addTo(map);
      destMarker.bindPopup(`<b>${destination.name || 'Destination'}</b><br>${destination.address || ''}`).openPopup();

      mapInstanceRef.current = map;
      destinationMarkerRef.current = destMarker;

      // Force resize after animation
      setTimeout(() => {
        if (map && mounted) {
          map.invalidateSize();
          setMapReady(true);
        }
      }, 300);
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      destinationMarkerRef.current = null;
      startMarkerRef.current = null;
      routeLayerRef.current = null;
      setMapReady(false);
    };
  }, [isOpen, destination]);

  // Cleanup state on close
  useEffect(() => {
    if (!isOpen) {
      setStartLocation('');
      setStartCoords(null);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setRouteInfo(null);
    }
  }, [isOpen]);

  // Search for locations
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2 || !GEOAPIFY_KEY) {
      setAutocompleteResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_KEY}&limit=5&filter=countrycode:in`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setAutocompleteResults(data.features || []);
      setShowAutocomplete(true);
    } catch (error) {
      console.error('Location search error:', error);
      setAutocompleteResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartLocation(value);
    setStartCoords(null);
    setRouteInfo(null);

    // Clear existing route when user changes input
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (startMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(value);
      }, 300);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  };

  // Select a location from autocomplete
  const selectLocation = (result: AutocompleteResult) => {
    const { formatted, lat, lon } = result.properties;
    setStartLocation(formatted);
    setStartCoords({ lat, lon });
    setShowAutocomplete(false);
    setAutocompleteResults([]);
  };

  // Calculate and display route
  const calculateRoute = async () => {
    if (!startCoords || !GEOAPIFY_KEY || !mapInstanceRef.current) return;

    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;

    setIsCalculatingRoute(true);

    try {
      // Remove previous route and start marker
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      if (startMarkerRef.current) {
        map.removeLayer(startMarkerRef.current);
        startMarkerRef.current = null;
      }

      // Add start marker with custom icon
      const startIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #007cba; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const startMarker = L.marker([startCoords.lat, startCoords.lon], { icon: startIcon }).addTo(map);
      startMarker.bindPopup(`<b>Start</b><br>${startLocation}`);
      startMarkerRef.current = startMarker;

      // Update destination marker with custom icon
      if (destinationMarkerRef.current) {
        map.removeLayer(destinationMarkerRef.current);
      }
      const destIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #dc3545; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const destMarker = L.marker([destination.latitude, destination.longitude], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`<b>Destination</b><br>${destination.name || destination.address || ''}`);
      destinationMarkerRef.current = destMarker;

      // Fetch route
      const url = `https://api.geoapify.com/v1/routing?waypoints=${startCoords.lat},${startCoords.lon}|${destination.latitude},${destination.longitude}&mode=drive&apiKey=${GEOAPIFY_KEY}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Route calculation failed');

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const route = data.features[0];
        const geometry = route.geometry;

        // Build coordinates array
        let coordinates: [number, number][] = [];
        if (geometry.type === 'MultiLineString') {
          geometry.coordinates.forEach((line: number[][]) => {
            line.forEach((coord: number[]) => {
              coordinates.push([coord[1], coord[0]]);
            });
          });
        } else if (geometry.type === 'LineString') {
          coordinates = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
        }

        // Draw route
        const polyline = L.polyline(coordinates, {
          color: '#007cba',
          weight: 5,
          opacity: 0.8,
        }).addTo(map);
        routeLayerRef.current = polyline;

        // Fit map to show entire route
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        // Extract route info
        const properties = route.properties;
        const distanceKm = (properties.distance / 1000).toFixed(1);
        const durationMin = Math.round(properties.time / 60);

        setRouteInfo({
          distance: `${distanceKm} km`,
          duration: durationMin >= 60
            ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
            : `${durationMin} min`,
        });
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStartCoords({ lat: latitude, lon: longitude });

        // Reverse geocode to get address
        try {
          const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_KEY}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            setStartLocation(data.features[0].properties.formatted);
          } else {
            setStartLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          setStartLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }

        setIsSearching(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enter it manually.');
        setIsSearching(false);
      }
    );
  };

  const destinationText = destination.name || destination.address ||
    `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Get Directions
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-80 p-4 border-b md:border-b-0 md:border-r space-y-4 shrink-0 overflow-y-auto max-h-[40vh] md:max-h-none">
            {/* Start Location */}
            <div className="space-y-2">
              <Label htmlFor="start-location" className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">A</div>
                Your Location
              </Label>
              <div className="relative">
                <Input
                  id="start-location"
                  value={startLocation}
                  onChange={handleInputChange}
                  onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
                  placeholder="Enter your starting location..."
                  className="pr-8"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}

                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteResults.map((result, index) => (
                      <button
                        key={index}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 truncate"
                        onClick={() => selectLocation(result)}
                      >
                        {result.properties.formatted}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={useCurrentLocation}
                disabled={isSearching}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use Current Location
              </Button>
            </div>

            {/* Destination (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold">B</div>
                Destination
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                {destinationText}
              </div>
            </div>

            {/* Get Directions Button */}
            <Button
              className="w-full"
              onClick={calculateRoute}
              disabled={!startCoords || isCalculatingRoute}
            >
              {isCalculatingRoute ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Route className="w-4 h-4 mr-2" />
                  Get Directions
                </>
              )}
            </Button>

            {/* Route Info */}
            {routeInfo && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <h4 className="font-semibold text-sm">Route Information</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Route className="w-4 h-4" />
                    <span>Distance: <strong className="text-foreground">{routeInfo.distance}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Duration: <strong className="text-foreground">{routeInfo.duration}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-muted min-h-[300px] md:min-h-0">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <div
              ref={mapContainerRef}
              className="absolute inset-0 w-full h-full"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
