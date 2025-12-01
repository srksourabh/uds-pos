import { useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { Database } from '../../lib/database.types';
import { CALL_MARKER_COLORS } from '../../lib/maps-config';
import {
  Phone,
  MapPin,
  Calendar,
  User,
  Wrench,
  ArrowRightLeft,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Call = Database['public']['Tables']['calls']['Row'] & {
  engineer?: { full_name: string } | null;
  bank?: { name: string } | null;
};

interface CallMarkerProps {
  call: Call;
  onClick?: (call: Call) => void;
  showInfo?: boolean;
}

const CALL_TYPE_ICONS: Record<string, typeof Wrench> = {
  install: Plus,
  swap: ArrowRightLeft,
  deinstall: Minus,
  maintenance: Wrench,
  breakdown: AlertTriangle
};

const CALL_TYPE_LABELS: Record<string, string> = {
  install: 'Installation',
  swap: 'Swap',
  deinstall: 'Deinstallation',
  maintenance: 'Maintenance',
  breakdown: 'Breakdown'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function CallMarker({ call, onClick, showInfo: defaultShowInfo = false }: CallMarkerProps) {
  const [showInfo, setShowInfo] = useState(defaultShowInfo);
  const navigate = useNavigate();

  if (!call.latitude || !call.longitude) {
    return null;
  }

  const position = {
    lat: call.latitude,
    lng: call.longitude
  };

  // Determine marker color based on priority and status
  let markerColor = CALL_MARKER_COLORS[call.status] || CALL_MARKER_COLORS.pending;
  if (call.priority === 'urgent' || call.priority === 'high') {
    markerColor = CALL_MARKER_COLORS[call.priority];
  }

  const TypeIcon = CALL_TYPE_ICONS[call.type] || Wrench;

  // Create custom marker icon as SVG data URL
  const markerIcon = {
    url: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16)
  };

  const handleViewDetails = () => {
    navigate(`/calls/${call.id}`);
  };

  return (
    <>
      <Marker
        position={position}
        icon={markerIcon}
        onClick={() => {
          setShowInfo(true);
          onClick?.(call);
        }}
        title={`${call.call_number} - ${call.client_name}`}
      />

      {showInfo && (
        <InfoWindow
          position={position}
          onCloseClick={() => setShowInfo(false)}
        >
          <div className="p-2 min-w-[240px] max-w-[300px]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: markerColor }}
                >
                  <TypeIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{call.call_number}</h3>
                  <p className="text-xs text-gray-500">{CALL_TYPE_LABELS[call.type]}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[call.status]}`}>
                {STATUS_LABELS[call.status]}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[call.priority]}`}>
                {call.priority.charAt(0).toUpperCase() + call.priority.slice(1)}
              </span>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2 text-gray-700">
                <User className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{call.client_name}</p>
                  {call.bank?.name && (
                    <p className="text-xs text-gray-500">{call.bank.name}</p>
                  )}
                </div>
              </div>

              {call.client_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3 h-3" />
                  <span>{call.client_phone}</span>
                </div>
              )}

              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="text-xs line-clamp-2">{call.client_address}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>{new Date(call.scheduled_date).toLocaleDateString()}</span>
                {call.scheduled_time_window && (
                  <span className="text-xs text-gray-500">({call.scheduled_time_window})</span>
                )}
              </div>

              {call.engineer?.full_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-3 h-3" />
                  <span>Assigned: {call.engineer.full_name}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200">
              <button
                onClick={handleViewDetails}
                className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
              >
                View Details
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default CallMarker;
