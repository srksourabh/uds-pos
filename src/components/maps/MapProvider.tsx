import { useLoadScript, Libraries } from '@react-google-maps/api';
import { ReactNode } from 'react';

const libraries: Libraries = ['places', 'marker'];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key-here';
}

interface MapProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function MapProvider({ children, fallback }: MapProviderProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (!isGoogleMapsConfigured()) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg p-8">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Google Maps API Key Not Configured</div>
          <div className="text-sm text-gray-400">
            Add VITE_GOOGLE_MAPS_API_KEY to your .env file
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg p-8">
        <div className="text-center text-red-600">
          <div className="mb-2">Failed to load Google Maps</div>
          <div className="text-sm">{loadError.message}</div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return fallback || (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="animate-pulse text-gray-500">Loading map...</div>
      </div>
    );
  }

  return <>{children}</>;
}
