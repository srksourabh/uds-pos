import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, Users, Battery, Signal, Clock, RefreshCw, Search,
  Filter, ChevronRight, Circle, AlertTriangle, Wifi, WifiOff,
  Navigation, Phone, Building2, User
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../../lib/supabase';

interface Engineer {
  id: string;
  emp_id: string | null;
  full_name: string;
  phone: string | null;
  region: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  last_sync_at: string | null;
  battery_percent: number | null;
  signal_strength: string | null;
  status: string;
  active: boolean;
  office_name?: string;
}

interface Office {
  id: string;
  name: string;
  code: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 22.5726,  // India center
  lng: 88.3639   // Kolkata
};

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export function LiveTracking() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Google Maps loader
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load engineers with location data
      const { data: engineerData, error } = await supabase
        .from('user_profiles')
        .select('id, emp_id, full_name, phone, region, last_location_lat, last_location_lng, last_sync_at, battery_percent, signal_strength, status, active, office_id')
        .eq('role', 'engineer')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;

      // Load offices for mapping
      const { data: officeData } = await supabase
        .from('warehouses')
        .select('id, name, code');
      
      if (officeData) {
        setOffices(officeData);
        
        // Create office map
        const officeMap = new Map<string, string>();
        officeData.forEach(o => officeMap.set(o.id, o.name));
        
        // Enrich engineers with office names
        const enrichedEngineers = (engineerData || []).map(e => ({
          ...e,
          office_name: e.office_id ? officeMap.get(e.office_id) : undefined
        }));
        
        setEngineers(enrichedEngineers);
      } else {
        setEngineers(engineerData || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading engineers:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Get unique regions
  const regions = [...new Set(engineers.map(e => e.region).filter(Boolean))] as string[];

  // Filter engineers
  const filteredEngineers = engineers.filter(e => {
    const matchesSearch = !searchTerm || 
      e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.emp_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone?.includes(searchTerm);
    
    const matchesRegion = !selectedRegion || e.region === selectedRegion;
    
    return matchesSearch && matchesRegion;
  });

  // Engineers with valid coordinates
  const engineersWithLocation = filteredEngineers.filter(
    e => e.last_location_lat && e.last_location_lng
  );

  // Get time since last sync
  const getTimeSinceSync = (syncTime: string | null): string => {
    if (!syncTime) return 'Never';
    
    const now = new Date();
    const sync = new Date(syncTime);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get sync status color
  const getSyncStatus = (syncTime: string | null): 'online' | 'idle' | 'offline' => {
    if (!syncTime) return 'offline';
    
    const now = new Date();
    const sync = new Date(syncTime);
    const diffMins = (now.getTime() - sync.getTime()) / 60000;

    if (diffMins < 5) return 'online';
    if (diffMins < 30) return 'idle';
    return 'offline';
  };

  // Get battery color
  const getBatteryColor = (percent: number | null): string => {
    if (percent === null) return 'text-gray-400';
    if (percent <= 20) return 'text-red-500';
    if (percent <= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get signal icon
  const getSignalIcon = (strength: string | null) => {
    if (!strength || strength === 'none') return <WifiOff className="w-4 h-4 text-gray-400" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  // Center map on engineer
  const focusEngineer = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    if (engineer.last_location_lat && engineer.last_location_lng) {
      setMapCenter({
        lat: engineer.last_location_lat,
        lng: engineer.last_location_lng
      });
    }
  };

  // Stats
  const stats = {
    total: filteredEngineers.length,
    online: filteredEngineers.filter(e => getSyncStatus(e.last_sync_at) === 'online').length,
    idle: filteredEngineers.filter(e => getSyncStatus(e.last_sync_at) === 'idle').length,
    offline: filteredEngineers.filter(e => getSyncStatus(e.last_sync_at) === 'offline').length,
    withLocation: engineersWithLocation.length
  };

  // Custom marker icon based on status
  const getMarkerIcon = (engineer: Engineer) => {
    const status = getSyncStatus(engineer.last_sync_at);
    const color = status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : '#6b7280';
    
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22)
    };
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Map Loading Error</h2>
          <p className="text-gray-600">Unable to load Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Navigation className="w-6 h-6 text-blue-600" />
              Live Tracking
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time field engineer locations
              <span className="ml-2 text-xs">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 sm:px-6 py-3 bg-white border-b">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{stats.total}</span>
            <span className="text-gray-500">Engineers</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-green-500 text-green-500" />
            <span className="font-medium text-green-600">{stats.online}</span>
            <span className="text-gray-500">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="font-medium text-yellow-600">{stats.idle}</span>
            <span className="text-gray-500">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />
            <span className="font-medium text-gray-600">{stats.offline}</span>
            <span className="text-gray-500">Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-blue-600">{stats.withLocation}</span>
            <span className="text-gray-500">With Location</span>
          </div>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
        {/* Left Panel: Engineer List */}
        <div className="w-full lg:w-96 bg-white border-r flex flex-col overflow-hidden">
          {/* Search and Filter */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Engineer List */}
          <div className="flex-1 overflow-y-auto">
            {loading && engineers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading engineers...
              </div>
            ) : filteredEngineers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No engineers found
              </div>
            ) : (
              <div className="divide-y">
                {filteredEngineers.map(engineer => {
                  const syncStatus = getSyncStatus(engineer.last_sync_at);
                  const isSelected = selectedEngineer?.id === engineer.id;
                  
                  return (
                    <div
                      key={engineer.id}
                      onClick={() => focusEngineer(engineer)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {/* Status indicator */}
                            <Circle className={`w-2.5 h-2.5 flex-shrink-0 ${
                              syncStatus === 'online' ? 'fill-green-500 text-green-500' :
                              syncStatus === 'idle' ? 'fill-yellow-500 text-yellow-500' :
                              'fill-gray-400 text-gray-400'
                            }`} />
                            <span className="font-medium text-gray-900 truncate">
                              {engineer.full_name}
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono">{engineer.emp_id || '-'}</span>
                            {engineer.region && (
                              <>
                                <span>•</span>
                                <span>{engineer.region}</span>
                              </>
                            )}
                          </div>

                          {/* Location info */}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            {/* Coordinates */}
                            {engineer.last_location_lat && engineer.last_location_lng ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <MapPin className="w-3 h-3" />
                                {engineer.last_location_lat.toFixed(4)}, {engineer.last_location_lng.toFixed(4)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-400">
                                <MapPin className="w-3 h-3" />
                                No location
                              </span>
                            )}
                          </div>

                          {/* Status row */}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {/* Battery */}
                            <span className={`flex items-center gap-1 ${getBatteryColor(engineer.battery_percent)}`}>
                              <Battery className="w-3 h-3" />
                              {engineer.battery_percent !== null ? `${engineer.battery_percent}%` : '-'}
                            </span>

                            {/* Signal */}
                            <span className="flex items-center gap-1">
                              {getSignalIcon(engineer.signal_strength)}
                              <span className="text-gray-500">{engineer.signal_strength || '-'}</span>
                            </span>

                            {/* Last sync */}
                            <span className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-3 h-3" />
                              {getTimeSinceSync(engineer.last_sync_at)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 relative bg-gray-100">
          {!isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={selectedEngineer ? 14 : 6}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              }}
            >
              {/* Engineer Markers */}
              {engineersWithLocation.map(engineer => (
                <Marker
                  key={engineer.id}
                  position={{
                    lat: engineer.last_location_lat!,
                    lng: engineer.last_location_lng!
                  }}
                  icon={getMarkerIcon(engineer)}
                  onClick={() => setSelectedEngineer(engineer)}
                  title={engineer.full_name}
                />
              ))}

              {/* Info Window */}
              {selectedEngineer && selectedEngineer.last_location_lat && selectedEngineer.last_location_lng && (
                <InfoWindow
                  position={{
                    lat: selectedEngineer.last_location_lat,
                    lng: selectedEngineer.last_location_lng
                  }}
                  onCloseClick={() => setSelectedEngineer(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">{selectedEngineer.full_name}</span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-mono">{selectedEngineer.emp_id || '-'}</span>
                      </div>
                      
                      {selectedEngineer.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${selectedEngineer.phone}`} className="text-blue-600 hover:underline">
                            {selectedEngineer.phone}
                          </a>
                        </div>
                      )}

                      {selectedEngineer.region && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-3 h-3" />
                          {selectedEngineer.region}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {selectedEngineer.last_location_lat?.toFixed(6)}, {selectedEngineer.last_location_lng?.toFixed(6)}
                      </div>

                      <div className="flex items-center gap-4 mt-2 pt-2 border-t">
                        <span className={`flex items-center gap-1 ${getBatteryColor(selectedEngineer.battery_percent)}`}>
                          <Battery className="w-3 h-3" />
                          {selectedEngineer.battery_percent ?? '-'}%
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceSync(selectedEngineer.last_sync_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
            <div className="font-medium mb-2">Status Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                <span>Online (&lt;5 min)</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <span>Idle (5-30 min)</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />
                <span>Offline (&gt;30 min)</span>
              </div>
            </div>
          </div>

          {/* No location warning */}
          {engineersWithLocation.length === 0 && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">No engineers with location data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveTracking;
