import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMapWrapper } from './GoogleMapWrapper';
import { EngineerMarker } from './EngineerMarker';
import { CallMarker } from './CallMarker';
import { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getBoundsFromMarkers, DEFAULT_CENTER } from '../../lib/maps-config';
import {
  RefreshCw,
  Users,
  Phone,
  Filter,
  Layers,
  ChevronDown
} from 'lucide-react';

type Engineer = Database['public']['Tables']['user_profiles']['Row'] & {
  bank?: { name: string } | null;
  active_calls_count?: number;
};

type Call = Database['public']['Tables']['calls']['Row'] & {
  engineer?: { full_name: string } | null;
  bank?: { name: string } | null;
};

interface LiveTrackingMapProps {
  className?: string;
  height?: string;
  showFilters?: boolean;
  showLegend?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type CallStatusFilter = 'all' | 'pending' | 'assigned' | 'in_progress' | 'completed';
type CallPriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export function LiveTrackingMap({
  className = '',
  height = '600px',
  showFilters = true,
  showLegend = true,
  autoRefresh = true,
  refreshInterval = 30000
}: LiveTrackingMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filters
  const [showEngineers, setShowEngineers] = useState(true);
  const [showCalls, setShowCalls] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CallStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<CallPriorityFilter>('all');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Fetch engineers with location data
  const fetchEngineers = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        bank:banks(name)
      `)
      .eq('role', 'engineer')
      .eq('status', 'active')
      .not('last_location_lat', 'is', null)
      .not('last_location_lng', 'is', null);

    if (error) {
      console.error('Error fetching engineers:', error);
      return;
    }

    // Cast data to proper type
    const engineerData = (data || []) as unknown as Engineer[];

    // Get active calls count for each engineer
    const engineerIds = engineerData.map(e => e.id);
    const { data: activeCalls } = await supabase
      .from('calls')
      .select('assigned_engineer')
      .in('assigned_engineer', engineerIds)
      .in('status', ['assigned', 'in_progress']);

    const callsData = (activeCalls || []) as unknown as Array<{ assigned_engineer: string | null }>;
    const callCounts = callsData.reduce((acc, call) => {
      if (call.assigned_engineer) {
        acc[call.assigned_engineer] = (acc[call.assigned_engineer] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    setEngineers(
      engineerData.map(e => ({
        ...e,
        active_calls_count: callCounts[e.id] || 0
      }))
    );
  }, []);

  // Fetch calls with location data
  const fetchCalls = useCallback(async () => {
    let query = supabase
      .from('calls')
      .select(`
        *,
        engineer:user_profiles!calls_assigned_engineer_fkey(full_name),
        bank:banks(name)
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('scheduled_date', { ascending: true });

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    } else {
      // By default, show active calls (not completed or cancelled)
      query = query.in('status', ['pending', 'assigned', 'in_progress']);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return;
    }

    // Cast data to proper type
    setCalls((data || []) as unknown as Call[]);
  }, [statusFilter, priorityFilter]);

  // Combined fetch function
  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEngineers(), fetchCalls()]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchEngineers, fetchCalls]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  // Refetch calls when filters change
  useEffect(() => {
    fetchCalls();
  }, [statusFilter, priorityFilter, fetchCalls]);

  // Set up real-time subscriptions
  useEffect(() => {
    const engineerChannel = supabase
      .channel('engineer-locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: 'role=eq.engineer'
        },
        () => {
          fetchEngineers();
        }
      )
      .subscribe();

    const callsChannel = supabase
      .channel('call-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls'
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(engineerChannel);
      supabase.removeChannel(callsChannel);
    };
  }, [fetchEngineers, fetchCalls]);

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    const markers: Array<{ lat: number; lng: number }> = [];

    if (showEngineers) {
      engineers.forEach(e => {
        if (e.last_location_lat && e.last_location_lng) {
          markers.push({ lat: e.last_location_lat, lng: e.last_location_lng });
        }
      });
    }

    if (showCalls) {
      calls.forEach(c => {
        if (c.latitude && c.longitude) {
          markers.push({ lat: c.latitude, lng: c.longitude });
        }
      });
    }

    return getBoundsFromMarkers(markers);
  }, [engineers, calls, showEngineers, showCalls]);

  // Fit bounds when data changes
  useEffect(() => {
    if (map && mapBounds) {
      map.fitBounds(mapBounds);
    }
  }, [map, mapBounds]);

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    totalEngineers: engineers.length,
    onlineEngineers: engineers.filter(e => {
      if (!e.last_location_updated_at) return false;
      const lastUpdate = new Date(e.last_location_updated_at);
      const diffMinutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
      return diffMinutes <= 30;
    }).length,
    totalCalls: calls.length,
    urgentCalls: calls.filter(c => c.priority === 'urgent' || c.priority === 'high').length
  }), [engineers, calls]);

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Live Map</h3>

            {/* Quick Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{stats.onlineEngineers}/{stats.totalEngineers} Online</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{stats.totalCalls} Calls</span>
                {stats.urgentCalls > 0 && (
                  <span className="text-red-600 font-medium">
                    ({stats.urgentCalls} urgent)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Layer toggles */}
            <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
              <button
                onClick={() => setShowEngineers(!showEngineers)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  showEngineers
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Engineers
              </button>
              <button
                onClick={() => setShowCalls(!showCalls)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  showCalls
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-1" />
                Calls
              </button>
            </div>

            {/* Filters dropdown */}
            {showFilters && (
              <div className="relative">
                <button
                  onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFiltersDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Call Status
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as CallStatusFilter)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">Active Calls</option>
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value as CallPriorityFilter)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ height }}>
        <GoogleMapWrapper
          className="h-full"
          center={DEFAULT_CENTER}
          zoom={5}
          onLoad={handleMapLoad}
        >
          {/* Engineer markers */}
          {showEngineers && engineers.map(engineer => (
            <EngineerMarker
              key={engineer.id}
              engineer={engineer}
            />
          ))}

          {/* Call markers */}
          {showCalls && calls.map(call => (
            <CallMarker
              key={call.id}
              call={call}
            />
          ))}
        </GoogleMapWrapper>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 font-medium">Legend:</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">Online Engineer</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                <span className="text-gray-600">Offline</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">Busy</span>
              </div>
            </div>

            <div className="border-l border-gray-300 pl-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-600">Assigned Call</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600">Urgent</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingMap;
