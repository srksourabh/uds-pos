import { useState, useEffect } from 'react';
import { LiveTrackingMap } from '../components/maps/LiveTrackingMap';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import {
  Users,
  Phone,
  AlertTriangle,
  Clock,
  MapPin,
  Activity
} from 'lucide-react';

type Engineer = Database['public']['Tables']['user_profiles']['Row'] & {
  bank?: { name: string } | null;
};

type Call = Database['public']['Tables']['calls']['Row'];

export function LiveMap() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const engineerChannel = supabase
      .channel('live-map-engineers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        () => fetchEngineers()
      )
      .subscribe();

    const callsChannel = supabase
      .channel('live-map-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls'
        },
        () => fetchCalls()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(engineerChannel);
      supabase.removeChannel(callsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEngineers(), fetchCalls()]);
    setLoading(false);
  };

  const fetchEngineers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*, bank:banks(name)')
      .eq('role', 'engineer')
      .eq('status', 'active');
    setEngineers(data || []);
  };

  const fetchCalls = async () => {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .in('status', ['pending', 'assigned', 'in_progress']);
    setCalls(data || []);
  };

  // Calculate stats
  const stats = {
    totalEngineers: engineers.length,
    onlineEngineers: engineers.filter(e => {
      if (!e.last_location_updated_at) return false;
      const lastUpdate = new Date(e.last_location_updated_at);
      const diffMinutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
      return diffMinutes <= 30;
    }).length,
    engineersWithLocation: engineers.filter(e => e.last_location_lat && e.last_location_lng).length,
    totalActiveCalls: calls.length,
    pendingCalls: calls.filter(c => c.status === 'pending').length,
    assignedCalls: calls.filter(c => c.status === 'assigned').length,
    inProgressCalls: calls.filter(c => c.status === 'in_progress').length,
    urgentCalls: calls.filter(c => c.priority === 'urgent' || c.priority === 'high').length,
    callsWithLocation: calls.filter(c => c.latitude && c.longitude).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Tracking Map</h1>
          <p className="text-gray-600 mt-1">
            Monitor engineer locations and service calls in real-time
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.onlineEngineers}</p>
              <p className="text-xs text-gray-500">Online Engineers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.engineersWithLocation}</p>
              <p className="text-xs text-gray-500">With Location</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Phone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalActiveCalls}</p>
              <p className="text-xs text-gray-500">Active Calls</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingCalls}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgressCalls}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.urgentCalls}</p>
              <p className="text-xs text-gray-500">Urgent/High</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <LiveTrackingMap
        height="calc(100vh - 380px)"
        showFilters={true}
        showLegend={true}
        autoRefresh={true}
        refreshInterval={30000}
      />

      {/* Quick Reference */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Engineers Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Engineer Status</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : engineers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No engineers found</div>
            ) : (
              engineers.slice(0, 10).map(engineer => {
                const isOnline = engineer.last_location_updated_at &&
                  (Date.now() - new Date(engineer.last_location_updated_at).getTime()) / (1000 * 60) <= 30;
                const hasLocation = engineer.last_location_lat && engineer.last_location_lng;

                return (
                  <div key={engineer.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-900">{engineer.full_name}</p>
                        <p className="text-xs text-gray-500">{engineer.bank?.name || 'No bank'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {hasLocation ? (
                        <span className="text-xs text-green-600">Location available</span>
                      ) : (
                        <span className="text-xs text-gray-400">No location</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Urgent Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Priority Calls</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : calls.filter(c => c.priority === 'urgent' || c.priority === 'high').length === 0 ? (
              <div className="p-4 text-center text-gray-500">No urgent calls</div>
            ) : (
              calls
                .filter(c => c.priority === 'urgent' || c.priority === 'high')
                .slice(0, 10)
                .map(call => (
                  <div key={call.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{call.call_number}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          call.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {call.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{call.client_name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {call.client_address}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        call.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                        call.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {call.status.replace('_', ' ')}
                      </span>
                      {call.latitude && call.longitude && (
                        <p className="text-xs text-green-600 mt-1">
                          <MapPin className="w-3 h-3 inline" /> Located
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveMap;
