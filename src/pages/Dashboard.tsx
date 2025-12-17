import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Smartphone,
  ClipboardList,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Map as MapIcon,
  Shield,
  Settings,
  ArrowRight
} from 'lucide-react';
import { CallsTrendChart } from '../components/charts/CallsTrendChart';
import { DeviceDistributionChart } from '../components/charts/DeviceDistributionChart';
import { PriorityPieChart } from '../components/charts/PriorityPieChart';
import { AdminMap } from '../components/maps/AdminMap';

interface DashboardStats {
  totalDevices: number;
  warehouseDevices: number;
  issuedDevices: number;
  installedDevices: number;
  faultyDevices: number;
  activeCalls: number;
  pendingCalls: number;
  completedToday: number;
  totalEngineers: number;
}

interface MapEngineer {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  active_calls: number;
  status: string;
  phone?: string;
  last_updated?: string;
}

interface MapCall {
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

export function Dashboard() {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const isEngineer = profile?.role === 'engineer';
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    warehouseDevices: 0,
    issuedDevices: 0,
    installedDevices: 0,
    faultyDevices: 0,
    activeCalls: 0,
    pendingCalls: 0,
    completedToday: 0,
    totalEngineers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [callsTrendData, setCallsTrendData] = useState<any[]>([]);
  const [deviceDistData, setDeviceDistData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [mapEngineers, setMapEngineers] = useState<MapEngineer[]>([]);
  const [mapCalls, setMapCalls] = useState<MapCall[]>([]);
  const [showMap, setShowMap] = useState(true);

  // Wait for auth to be ready before loading data
  useEffect(() => {
    // Don't load until we know the user's role (profile must be loaded)
    if (profile === null) {
      return;
    }

    // Capture current isAdmin value for this effect run
    const currentIsAdmin = isAdmin;

    loadDashboardStats(currentIsAdmin);
    loadChartData();
    loadMapData();

    const devicesChannel = supabase
      .channel('dashboard-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        loadDashboardStats(currentIsAdmin);
        loadChartData();
      })
      .subscribe();

    const callsChannel = supabase
      .channel('dashboard-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        loadDashboardStats(currentIsAdmin);
        loadChartData();
        loadMapData();
      })
      .subscribe();

    const engineersChannel = supabase
      .channel('dashboard-engineers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        loadMapData();
      })
      .subscribe();

    return () => {
      devicesChannel.unsubscribe();
      callsChannel.unsubscribe();
      engineersChannel.unsubscribe();
    };
  }, [profile, isAdmin]);

  const loadDashboardStats = async (adminAccess: boolean = isAdmin) => {
    try {
      const [devicesRes, callsRes, engineersRes] = await Promise.all([
        supabase.from('devices').select('status'),
        supabase.from('calls').select('status, completed_at'),
        adminAccess ? supabase.from('user_profiles').select('id').eq('role', 'engineer') : Promise.resolve({ data: [] })
      ]);

      // Debug logging for development
      if (import.meta.env.DEV) {
        console.log('[Dashboard] Query results:', {
          devices: { data: devicesRes.data?.length, error: devicesRes.error },
          calls: { data: callsRes.data?.length, error: callsRes.error },
          engineers: { data: engineersRes.data?.length, error: (engineersRes as any).error },
          adminAccess
        });
      }

      // Log any errors
      if (devicesRes.error) console.error('[Dashboard] Devices query error:', devicesRes.error);
      if (callsRes.error) console.error('[Dashboard] Calls query error:', callsRes.error);
      if ((engineersRes as any).error) console.error('[Dashboard] Engineers query error:', (engineersRes as any).error);

      const devices = devicesRes.data || [];
      const calls = callsRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setStats({
        totalDevices: devices.length,
        warehouseDevices: devices.filter(d => d.status === 'warehouse').length,
        issuedDevices: devices.filter(d => d.status === 'issued').length,
        installedDevices: devices.filter(d => d.status === 'installed').length,
        faultyDevices: devices.filter(d => d.status === 'faulty').length,
        activeCalls: calls.filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status)).length,
        pendingCalls: calls.filter(c => c.status === 'pending').length,
        completedToday: calls.filter(c =>
          c.status === 'completed' &&
          c.completed_at &&
          new Date(c.completed_at) >= today
        ).length,
        totalEngineers: engineersRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const { data: calls } = await supabase
        .from('calls')
        .select('status, created_at, priority')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const trendData = last7Days.map(date => {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayCalls = (calls || []).filter(c => {
          const callDate = new Date(c.created_at);
          return callDate >= dayStart && callDate <= dayEnd;
        });

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pending: dayCalls.filter(c => c.status === 'pending').length,
          assigned: dayCalls.filter(c => c.status === 'assigned').length,
          in_progress: dayCalls.filter(c => c.status === 'in_progress').length,
          completed: dayCalls.filter(c => c.status === 'completed').length,
        };
      });
      setCallsTrendData(trendData);

      const { data: devices } = await supabase
        .from('devices')
        .select('status, device_bank(name)');

      const bankMap = new Map<string, any>();
      (devices || []).forEach(device => {
        const bankName = device.device_bank?.name || 'Unknown';
        if (!bankMap.has(bankName)) {
          bankMap.set(bankName, { bank: bankName, warehouse: 0, issued: 0, installed: 0, faulty: 0 });
        }
        const bankData = bankMap.get(bankName)!;
        if (device.status === 'warehouse') bankData.warehouse++;
        else if (device.status === 'issued') bankData.issued++;
        else if (device.status === 'installed') bankData.installed++;
        else if (device.status === 'faulty') bankData.faulty++;
      });
      setDeviceDistData(Array.from(bankMap.values()));

      const activeCalls = (calls || []).filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status));
      const priority = [
        { name: 'Low', value: activeCalls.filter(c => c.priority === 'low').length },
        { name: 'Medium', value: activeCalls.filter(c => c.priority === 'medium').length },
        { name: 'High', value: activeCalls.filter(c => c.priority === 'high').length },
        { name: 'Urgent', value: activeCalls.filter(c => c.priority === 'urgent').length },
      ];
      setPriorityData(priority);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  const loadMapData = async () => {
    try {
      // Load engineers with location data
      const { data: engineers } = await supabase
        .from('user_profiles')
        .select('id, full_name, last_location_lat, last_location_lng, phone, active, last_location_updated_at')
        .eq('role', 'engineer');

      // Load active calls with location data
      const { data: calls } = await supabase
        .from('calls')
        .select('id, call_number, type, status, priority, client_name, client_address, latitude, longitude, assigned_engineer, scheduled_date')
        .in('status', ['pending', 'assigned', 'in_progress']);

      // Count active calls per engineer
      const engineerCallCounts = new Map<string, number>();
      (calls || []).forEach(call => {
        if (call.assigned_engineer) {
          engineerCallCounts.set(
            call.assigned_engineer,
            (engineerCallCounts.get(call.assigned_engineer) || 0) + 1
          );
        }
      });

      const mappedEngineers: MapEngineer[] = (engineers || []).map(eng => ({
        id: eng.id,
        name: eng.full_name || 'Unknown',
        latitude: eng.last_location_lat,
        longitude: eng.last_location_lng,
        active_calls: engineerCallCounts.get(eng.id) || 0,
        status: eng.active ? (engineerCallCounts.get(eng.id) ? 'busy' : 'active') : 'offline',
        phone: eng.phone ?? undefined,
        last_updated: eng.last_location_updated_at ?? undefined,
      }));

      const mappedCalls: MapCall[] = (calls || []).map(call => ({
        id: call.id,
        call_number: call.call_number,
        type: call.type,
        status: call.status,
        priority: call.priority,
        client_name: call.client_name,
        client_address: call.client_address,
        latitude: call.latitude,
        longitude: call.longitude,
        assigned_engineer: call.assigned_engineer ?? undefined,
        scheduled_date: call.scheduled_date,
      }));

      setMapEngineers(mappedEngineers);
      setMapCalls(mappedCalls);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      icon: Smartphone,
      color: 'blue',
      bgColor: 'bg-blue-500',
    },
    {
      title: 'Warehouse',
      value: stats.warehouseDevices,
      icon: Package,
      color: 'gray',
      bgColor: 'bg-gray-500',
    },
    {
      title: 'Issued',
      value: stats.issuedDevices,
      icon: TrendingUp,
      color: 'yellow',
      bgColor: 'bg-yellow-500',
    },
    {
      title: 'Installed',
      value: stats.installedDevices,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500',
    },
    {
      title: 'Faulty',
      value: stats.faultyDevices,
      icon: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-500',
    },
    {
      title: 'Active Calls',
      value: stats.activeCalls,
      icon: ClipboardList,
      color: 'blue',
      bgColor: 'bg-blue-500',
    },
    {
      title: 'Pending',
      value: stats.pendingCalls,
      icon: Clock,
      color: 'orange',
      bgColor: 'bg-orange-500',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500',
    },
  ];

  if (isAdmin) {
    statCards.push({
      title: 'Total Engineers',
      value: stats.totalEngineers,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-500',
    });
  }

  // Role-based welcome message
  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isAdmin) return 'Administrator';
    return 'Field Engineer';
  };

  const getRoleDescription = () => {
    if (isSuperAdmin) return 'Full system access - Manage users, permissions, and all operations';
    if (isAdmin) return 'Manage field operations, engineers, and service calls';
    return 'View your assigned calls and track your daily tasks';
  };

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name}
          </h1>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            isSuperAdmin ? 'bg-purple-100 text-purple-700' :
            isAdmin ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {getRoleLabel()}
          </span>
        </div>
        <p className="text-gray-600">
          {getRoleDescription()}
        </p>
      </div>

      {/* Super Admin Quick Actions */}
      {isSuperAdmin && (
        <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/users"
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-5 text-white hover:from-purple-700 hover:to-purple-800 transition group"
          >
            <div className="flex items-center gap-4 min-h-[80px]">
              <div className="bg-white/20 p-3 rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">User Management</h3>
                <p className="text-purple-100 text-sm">Manage users & permissions</p>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </div>
          </Link>
          <Link
            to="/engineers"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white hover:from-blue-700 hover:to-blue-800 transition group"
          >
            <div className="flex items-center gap-4 min-h-[80px]">
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Engineers</h3>
                <p className="text-blue-100 text-sm">View all field engineers</p>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </div>
          </Link>
          <Link
            to="/reports"
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white hover:from-green-700 hover:to-green-800 transition group"
          >
            <div className="flex items-center gap-4 min-h-[80px]">
              <div className="bg-white/20 p-3 rounded-lg">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Reports</h3>
                <p className="text-green-100 text-sm">Analytics & reports</p>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      )}

      {/* Engineer Quick Actions */}
      {isEngineer && (
        <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/calls"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white hover:from-blue-700 hover:to-blue-800 transition group"
          >
            <div className="flex items-center gap-4 min-h-[80px]">
              <div className="bg-white/20 p-3 rounded-lg">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">My Calls</h3>
                <p className="text-blue-100 text-sm">View your assigned service calls</p>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </div>
          </Link>
          <Link
            to="/stock"
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white hover:from-green-700 hover:to-green-800 transition group"
          >
            <div className="flex items-center gap-4 min-h-[80px]">
              <div className="bg-white/20 p-3 rounded-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">My Inventory</h3>
                <p className="text-green-100 text-sm">Devices assigned to you</p>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition min-h-[110px] flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs md:text-sm font-medium text-gray-600 flex-1 pr-2">{stat.title}</p>
                <div className={`${stat.bgColor} p-2 rounded-lg flex-shrink-0`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Live Map Section */}
      {isAdmin && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Live Map</h2>
              <span className="text-sm text-gray-500">
                ({mapEngineers.filter(e => e.latitude).length} engineers, {mapCalls.filter(c => c.latitude).length} calls)
              </span>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition min-h-[44px] min-w-[100px]"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
          {showMap && (
            <AdminMap
              engineers={mapEngineers}
              calls={mapCalls}
              height="450px"
              showClustering={true}
            />
          )}
        </div>
      )}

      {/* Charts - Admin/Super Admin only */}
      {isAdmin && (
        <>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Calls Trend (Last 7 Days)</h2>
              <CallsTrendChart data={callsTrendData} loading={chartsLoading} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Active Calls by Priority</h2>
              <PriorityPieChart data={priorityData} loading={chartsLoading} />
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Device Distribution by Bank</h2>
            <DeviceDistributionChart data={deviceDistData} loading={chartsLoading} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Device Status Overview</h2>
              <div className="space-y-4">
                {[
                  { label: 'Warehouse', value: stats.warehouseDevices, total: stats.totalDevices, color: 'bg-gray-500' },
                  { label: 'Issued', value: stats.issuedDevices, total: stats.totalDevices, color: 'bg-yellow-500' },
                  { label: 'Installed', value: stats.installedDevices, total: stats.totalDevices, color: 'bg-green-500' },
                  { label: 'Faulty', value: stats.faultyDevices, total: stats.totalDevices, color: 'bg-red-500' },
                ].map((item) => {
                  const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Call Status Overview</h2>
              <div className="space-y-4">
                {[
                  { label: 'Pending', value: stats.pendingCalls, total: stats.activeCalls, color: 'bg-orange-500' },
                  { label: 'In Progress', value: stats.activeCalls - stats.pendingCalls, total: stats.activeCalls, color: 'bg-blue-500' },
                  { label: 'Completed Today', value: stats.completedToday, total: stats.activeCalls + stats.completedToday, color: 'bg-green-500' },
                ].map((item) => {
                  const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Engineer simplified view */}
      {isEngineer && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Your Call Status</h2>
          <div className="space-y-4">
            {[
              { label: 'Pending Calls', value: stats.pendingCalls, color: 'bg-orange-500' },
              { label: 'In Progress', value: stats.activeCalls - stats.pendingCalls, color: 'bg-blue-500' },
              { label: 'Completed Today', value: stats.completedToday, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 md:p-5 bg-gray-50 rounded-lg min-h-[68px]">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <span className="text-xl md:text-2xl font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
