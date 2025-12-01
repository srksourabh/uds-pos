import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: Date | null;
  error: string | null;
  isTracking: boolean;
}

interface UseLocationTrackingOptions {
  enableHighAccuracy?: boolean;
  updateInterval?: number; // in milliseconds
  autoStart?: boolean;
  minDistanceForUpdate?: number; // in meters
}

const DEFAULT_OPTIONS: UseLocationTrackingOptions = {
  enableHighAccuracy: true,
  updateInterval: 60000, // 1 minute
  autoStart: true,
  minDistanceForUpdate: 50 // 50 meters
};

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
  const { user, profile } = useAuth();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isTracking: false
  });

  const lastSentLocation = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Update location in database
  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    if (!user?.id) return;

    // Check if we've moved enough to warrant an update
    if (lastSentLocation.current) {
      const distance = calculateDistanceMeters(
        lastSentLocation.current.lat,
        lastSentLocation.current.lng,
        lat,
        lng
      );
      if (distance < (opts.minDistanceForUpdate || 50)) {
        return; // Haven't moved enough
      }
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          last_location_lat: lat,
          last_location_lng: lng,
          last_location_updated_at: new Date().toISOString()
        } as Record<string, unknown>)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating location:', error);
      } else {
        lastSentLocation.current = { lat, lng };
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, [user?.id, opts.minDistanceForUpdate]);

  // Get current position
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, [opts.enableHighAccuracy]);

  // Update location
  const updateLocation = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      setLocationState(prev => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
        error: null
      }));

      // Update in database
      await updateLocationInDb(latitude, longitude);
    } catch (error) {
      const errorMessage = error instanceof GeolocationPositionError
        ? getGeolocationErrorMessage(error)
        : 'Failed to get location';

      setLocationState(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [getCurrentPosition, updateLocationInDb]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        isTracking: false
      }));
      return;
    }

    // Don't track if not an engineer
    if (profile?.role !== 'engineer') {
      return;
    }

    setLocationState(prev => ({ ...prev, isTracking: true }));

    // Get initial position
    updateLocation();

    // Set up interval for periodic updates
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(updateLocation, opts.updateInterval);

    // Also watch position for significant changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationState(prev => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
          error: null
        }));
        updateLocationInDb(latitude, longitude);
      },
      (error) => {
        setLocationState(prev => ({
          ...prev,
          error: getGeolocationErrorMessage(error)
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: 30000,
        timeout: 10000
      }
    );
  }, [profile?.role, updateLocation, updateLocationInDb, opts.updateInterval, opts.enableHighAccuracy]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLocationState(prev => ({ ...prev, isTracking: false }));
  }, []);

  // Auto-start tracking
  useEffect(() => {
    if (opts.autoStart && user && profile?.role === 'engineer') {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [opts.autoStart, user, profile?.role, startTracking, stopTracking]);

  // Force update location
  const forceUpdate = useCallback(async () => {
    lastSentLocation.current = null; // Reset to force update regardless of distance
    await updateLocation();
  }, [updateLocation]);

  return {
    ...locationState,
    startTracking,
    stopTracking,
    forceUpdate,
    updateLocation
  };
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable';
    case error.TIMEOUT:
      return 'Location request timed out';
    default:
      return 'Unknown location error';
  }
}

export default useLocationTracking;
