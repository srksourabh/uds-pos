import { ReactNode, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import {
  GOOGLE_MAPS_API_KEY,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLES,
  MAP_CONTAINER_STYLE
} from '../../lib/maps-config';
import { Loader2, MapPin } from 'lucide-react';

interface GoogleMapWrapperProps {
  children?: ReactNode;
  center?: { lat: number; lng: number };
  zoom?: number;
  onLoad?: (map: google.maps.Map) => void;
  onUnmount?: () => void;
  className?: string;
  showControls?: boolean;
}

export function GoogleMapWrapper({
  children,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onLoad,
  onUnmount,
  className = '',
  showControls = true
}: GoogleMapWrapperProps) {
  const [_map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const handleLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    onLoad?.(mapInstance);
  }, [onLoad]);

  const handleUnmount = useCallback(() => {
    setMap(null);
    onUnmount?.();
  }, [onUnmount]);

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Failed to load Google Maps</p>
          <p className="text-gray-500 text-sm mt-1">
            Please check your API key configuration
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Google Maps API Key Required</p>
          <p className="text-gray-500 text-sm mt-1">
            Add VITE_GOOGLE_MAPS_API_KEY to your environment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ minHeight: '400px' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={zoom}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: !showControls,
          zoomControl: showControls,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: showControls,
          gestureHandling: 'greedy'
        }}
      >
        {children}
      </GoogleMap>
    </div>
  );
}

export default GoogleMapWrapper;
