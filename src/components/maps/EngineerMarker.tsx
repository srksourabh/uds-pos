import { useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { Database } from '../../lib/database.types';
import {
  ENGINEER_MARKER_COLORS,
  isLocationRecent,
  formatLastUpdated
} from '../../lib/maps-config';
import { User, Phone, MapPin, Clock } from 'lucide-react';

type Engineer = Database['public']['Tables']['user_profiles']['Row'] & {
  bank?: { name: string } | null;
  active_calls_count?: number;
};

interface EngineerMarkerProps {
  engineer: Engineer;
  onClick?: (engineer: Engineer) => void;
}

export function EngineerMarker({ engineer, onClick }: EngineerMarkerProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!engineer.last_location_lat || !engineer.last_location_lng) {
    return null;
  }

  const position = {
    lat: engineer.last_location_lat,
    lng: engineer.last_location_lng
  };

  const isRecent = isLocationRecent(engineer.last_location_updated_at, 30);
  const isOnline = isRecent && engineer.status === 'active';
  const isBusy = (engineer.active_calls_count ?? 0) > 0;

  const markerColor = isOnline
    ? (isBusy ? ENGINEER_MARKER_COLORS.busy : ENGINEER_MARKER_COLORS.online)
    : ENGINEER_MARKER_COLORS.offline;

  // Create custom marker icon as SVG data URL
  const markerIcon = {
    url: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="${markerColor}"/>
        <circle cx="20" cy="18" r="10" fill="white"/>
        <circle cx="20" cy="15" r="4" fill="${markerColor}"/>
        <path d="M12 23c0-4 4-6 8-6s8 2 8 6" fill="${markerColor}" stroke="${markerColor}" stroke-width="2"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(40, 48),
    anchor: new google.maps.Point(20, 48)
  };

  return (
    <>
      <Marker
        position={position}
        icon={markerIcon}
        onClick={() => {
          setShowInfo(true);
          onClick?.(engineer);
        }}
        title={engineer.full_name}
      />

      {showInfo && (
        <InfoWindow
          position={position}
          onCloseClick={() => setShowInfo(false)}
        >
          <div className="p-2 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: markerColor }}
              >
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{engineer.full_name}</h3>
                <p className="text-xs text-gray-500">{engineer.bank?.name || 'No bank assigned'}</p>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              {engineer.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3 h-3" />
                  <span>{engineer.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>Updated: {formatLastUpdated(engineer.last_location_updated_at)}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">
                  {engineer.last_location_lat.toFixed(4)}, {engineer.last_location_lng.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isOnline
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {isBusy && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {engineer.active_calls_count} active call(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default EngineerMarker;
