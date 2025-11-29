export interface Location {
  lat: number;
  lng: number;
}

export function haversineDistance(loc1: Location, loc2: Location): number {
  const R = 6371;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
    Math.cos(toRad(loc2.lat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number | null {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }
  return haversineDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

export const REGION_CENTERS: Record<string, Location> = {
  'North': { lat: -25.7479, lng: 28.2293 },
  'South': { lat: -33.9249, lng: 18.4241 },
  'East': { lat: -29.8587, lng: 31.0218 },
  'West': { lat: -28.7282, lng: 24.7499 },
  'Central': { lat: -26.2041, lng: 28.0473 },
};