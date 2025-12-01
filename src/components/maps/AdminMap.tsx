import { useState, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { MapProvider, isGoogleMapsConfigured } from './MapProvider';
import { MapPin, User, Phone, Clock, AlertTriangle } from 'lucide-react';

interface Engineer {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  active_calls: number;
  status: string;
  phone?: string;
  last_updated?: string;
}

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  priority: string;
  client_name: string;
  client_address: string;
  latitude: number | null;
  longitude: number | null;
  assigned_engineer?: string;
  scheduled_date?: string;
}

interface AdminMapProps {
  engineers: Engineer[];
  calls: Call[];
  onEngineerClick?: (engineer: Engineer) => void;
  onCallClick?: (call: Call) => void;
  height?: string;
  showClustering?: boolean;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (India)
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

// Priority colors for calls
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444', // red
  high: '#F97316', // orange
  medium: '#EAB308', // yellow
  low: '#22C55E', // green
};

// Status colors for engineers
const ENGINEER_STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  busy: '#F97316',
  offline: '#9CA3AF',
};

function AdminMapContent({
  engineers,
  calls,
  onEngineerClick,
  onCallClick,
  showClustering = true,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}: AdminMapProps) {
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Filter items with valid coordinates
  const validEngineers = useMemo(
    () => engineers.filter(e => e.latitude != null && e.longitude != null),
    [engineers]
  );

  const validCalls = useMemo(
    () => calls.filter(c => c.latitude != null && c.longitude != null),
    [calls]
  );

  // Calculate center based on markers
  const center = useMemo(() => {
    const allPoints = [
      ...validEngineers.map(e => ({ lat: e.latitude!, lng: e.longitude! })),
      ...validCalls.map(c => ({ lat: c.latitude!, lng: c.longitude! })),
    ];

    if (allPoints.length === 0) return defaultCenter;

    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
    return { lat: avgLat, lng: avgLng };
  }, [validEngineers, validCalls, defaultCenter]);

  const handleEngineerClick = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    setSelectedCall(null);
    onEngineerClick?.(engineer);
  };

  const handleCallClick = (call: Call) => {
    setSelectedCall(call);
    setSelectedEngineer(null);
    onCallClick?.(call);
  };

  // Fit bounds to show all markers
  const fitBounds = useCallback(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    validEngineers.forEach(e => {
      bounds.extend({ lat: e.latitude!, lng: e.longitude! });
      hasPoints = true;
    });

    validCalls.forEach(c => {
      bounds.extend({ lat: c.latitude!, lng: c.longitude! });
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [map, validEngineers, validCalls]);

  const engineerMarkers = validEngineers.map(engineer => (
    <Marker
      key={`engineer-${engineer.id}`}
      position={{ lat: engineer.latitude!, lng: engineer.longitude! }}
      onClick={() => handleEngineerClick(engineer)}
      icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: ENGINEER_STATUS_COLORS[engineer.status] || '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      }}
      title={engineer.name}
    />
  ));

  const callMarkers = validCalls.map(call => (
    <Marker
      key={`call-${call.id}`}
      position={{ lat: call.latitude!, lng: call.longitude! }}
      onClick={() => handleCallClick(call)}
      icon={{
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
        scale: 1.5,
        fillColor: PRIORITY_COLORS[call.priority] || '#6B7280',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1,
        anchor: new google.maps.Point(12, 22),
      }}
      title={`${call.call_number} - ${call.client_name}`}
    />
  ));

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={defaultZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {showClustering ? (
          <>
            <MarkerClusterer>
              {(clusterer) => (
                <>
                  {validEngineers.map(engineer => (
                    <Marker
                      key={`engineer-${engineer.id}`}
                      position={{ lat: engineer.latitude!, lng: engineer.longitude! }}
                      onClick={() => handleEngineerClick(engineer)}
                      clusterer={clusterer}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: ENGINEER_STATUS_COLORS[engineer.status] || '#3B82F6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                      }}
                      title={engineer.name}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>
            {callMarkers}
          </>
        ) : (
          <>
            {engineerMarkers}
            {callMarkers}
          </>
        )}

        {/* Engineer Info Window */}
        {selectedEngineer && selectedEngineer.latitude && selectedEngineer.longitude && (
          <InfoWindow
            position={{ lat: selectedEngineer.latitude, lng: selectedEngineer.longitude }}
            onCloseClick={() => setSelectedEngineer(null)}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="font-semibold">{selectedEngineer.name}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedEngineer.status === 'active' ? 'bg-green-500' :
                    selectedEngineer.status === 'busy' ? 'bg-orange-500' : 'bg-gray-400'
                  }`} />
                  <span className="capitalize">{selectedEngineer.status}</span>
                </div>
                <div>Active Calls: {selectedEngineer.active_calls}</div>
                {selectedEngineer.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedEngineer.phone}
                  </div>
                )}
                {selectedEngineer.last_updated && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Updated: {new Date(selectedEngineer.last_updated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Call Info Window */}
        {selectedCall && selectedCall.latitude && selectedCall.longitude && (
          <InfoWindow
            position={{ lat: selectedCall.latitude, lng: selectedCall.longitude }}
            onCloseClick={() => setSelectedCall(null)}
          >
            <div className="p-2 min-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: PRIORITY_COLORS[selectedCall.priority] }} />
                <span className="font-semibold">{selectedCall.call_number}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                  selectedCall.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  selectedCall.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  selectedCall.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedCall.priority}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="font-medium">{selectedCall.client_name}</div>
                <div className="text-xs">{selectedCall.client_address}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="capitalize text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                    {selectedCall.type}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                    selectedCall.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    selectedCall.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    selectedCall.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                    selectedCall.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedCall.status}
                  </span>
                </div>
                {selectedCall.scheduled_date && (
                  <div className="text-xs text-gray-400">
                    Scheduled: {new Date(selectedCall.scheduled_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Active Engineer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Busy Engineer</span>
          </div>
          <div className="border-t my-2" />
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>Urgent Call</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-orange-500" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-yellow-500" />
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-green-500" />
            <span>Low Priority</span>
          </div>
        </div>
      </div>

      {/* Fit Bounds Button */}
      <button
        onClick={fitBounds}
        className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        Fit All
      </button>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-500">Engineers:</span>{' '}
            <span className="font-semibold">{validEngineers.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Calls:</span>{' '}
            <span className="font-semibold">{validCalls.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminMap(props: AdminMapProps) {
  if (!isGoogleMapsConfigured()) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8" style={{ height: props.height || '400px' }}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <div className="text-gray-600 font-medium mb-1">Google Maps Not Configured</div>
          <div className="text-sm text-gray-400">
            Add VITE_GOOGLE_MAPS_API_KEY to your environment variables
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: props.height || '400px' }}>
      <MapProvider>
        <AdminMapContent {...props} />
      </MapProvider>
    </div>
  );
}
