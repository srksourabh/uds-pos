// Google Maps configuration and utilities

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Default center (India - can be configured per deployment)
export const DEFAULT_CENTER = {
  lat: 20.5937,
  lng: 78.9629
};

export const DEFAULT_ZOOM = 5;

// Map styles for a cleaner look
export const MAP_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
];

// Map container styles
export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%'
};

// Marker colors by status/type
export const ENGINEER_MARKER_COLORS = {
  online: '#22c55e',    // green
  offline: '#9ca3af',   // gray
  busy: '#f59e0b',      // amber
  default: '#3b82f6'    // blue
};

export const CALL_MARKER_COLORS = {
  pending: '#6b7280',      // gray
  assigned: '#3b82f6',     // blue
  in_progress: '#f59e0b',  // amber
  completed: '#22c55e',    // green
  cancelled: '#ef4444',    // red
  urgent: '#dc2626',       // red-600
  high: '#f97316',         // orange
  medium: '#eab308',       // yellow
  low: '#22c55e'           // green
};

export const CALL_TYPE_ICONS = {
  install: 'M12 4v16m8-8H4',
  swap: 'M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4',
  deinstall: 'M6 18L18 6M6 6l12 12',
  maintenance: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
  breakdown: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
};

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// Get bounds that fit all markers
export function getBoundsFromMarkers(
  markers: Array<{ lat: number; lng: number }>
): google.maps.LatLngBoundsLiteral | null {
  if (markers.length === 0) return null;

  let minLat = markers[0].lat;
  let maxLat = markers[0].lat;
  let minLng = markers[0].lng;
  let maxLng = markers[0].lng;

  markers.forEach(marker => {
    minLat = Math.min(minLat, marker.lat);
    maxLat = Math.max(maxLat, marker.lat);
    minLng = Math.min(minLng, marker.lng);
    maxLng = Math.max(maxLng, marker.lng);
  });

  // Add padding
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

  return {
    north: maxLat + latPadding,
    south: minLat - latPadding,
    east: maxLng + lngPadding,
    west: minLng - lngPadding
  };
}

// Check if location was updated recently (within minutes)
export function isLocationRecent(lastUpdated: string | null, withinMinutes: number = 30): boolean {
  if (!lastUpdated) return false;
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= withinMinutes;
}

// Format last updated time
export function formatLastUpdated(lastUpdated: string | null): string {
  if (!lastUpdated) return 'Never';

  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
