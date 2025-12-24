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
  ArrowRight,
  ExternalLink,
  PlayCircle,
  RefreshCw,
  Calendar,
  Receipt,
  Wrench,
  BoxIcon
} from 'lucide-react';
import { StatDetailModal, StatType } from '../components/StatDetailModal';
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

// Engineer-specific stats
interface EngineerStats {
  myAssignedCalls: number;
  myTodayPOA: number;
  myCompletedToday: number;
  myDevices: number;
  pendingExpenses: number;
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

interface MapMerchant {
  id: string;
  mid: string;
  merchant_name: string;
  latitude: number | null;
  longitude: number | null;
  city?: string;
  state?: string;
  phone?: string;
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
  const [mapMerchants, setMapMerchants] = useState<MapMerchant[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [selectedStat, setSelectedStat] = useState<{ type: StatType; title: string } | null>(null);
  
  // Engineer-specific stats
  const [engineerStats, setEngineerStats] = useState<EngineerStats>({
    myAssignedCalls: 0,
    myTodayPOA: 0,
    myCompletedToday: 0,
    myDevices: 0,
    pendingExpenses: 0,
  });

  // Wait for auth to be ready before loading data
  useEffect(() => {
    // Don't load until we know the user's role (profile must be loaded)
    if (profile === null) {
      return;
    }

    // Capture current isAdmin value for this effect run
    const currentIsAdmin = isAdmin;
    const currentIsEngineer = profile?.role === 'engineer';

    loadDashboardStats(currentIsAdmin);
    loadChartData();
    loadMapData();
    
    // Load engineer-specific stats if user is an engineer
    if (currentIsEngineer && profile?.id) {
      loadEngineerStats(profile.id);
    }

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

      // FIXED: Correct Supabase relationship syntax
      const { data: devices } = await supabase
        .from('devices')
        .select(`
          status,
          banks!device_bank(name)
        `);

      const bankMap = new Map<string, any>();
      (devices || []).forEach(device => {
        // FIXED: Access device.banks instead of device.device_bank
        const bankName = device.banks?.name || 'Unknown';
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

      // Load merchants with location data - FIXED: use contact_phone instead of phone
      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, mid, merchant_name, latitude, longitude, city, state, contact_phone');

      const mappedMerchants: MapMerchant[] = (merchants || []).map(m => ({
        id: m.id,
        mid: m.mid,
        merchant_name: m.merchant_name,
        latitude: m.latitude,
        longitude: m.longitude,
        city: m.city ?? undefined,
        state: m.state ?? undefined,
        phone: m.contact_phone ?? undefined,
      }));

      setMapEngineers(mappedEngineers);
      setMapCalls(mappedCalls);
      setMapMerchants(mappedMerchants);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  // Load engineer-specific stats
  const loadEngineerStats = async (engineerId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch engineer's calls
      const { data: myCalls } = await supabase
        .from('calls')
        .select('id, status, completed_at, scheduled_date')
        .eq('assigned_engineer', engineerId);

      // Fetch engineer's devices
      const { data: myDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('assigned_engineer', engineerId);

      // Fetch pending expense claims
      const { data: myExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('engineer_id', engineerId)
        .eq('status', 'pending');

      const calls = myCalls || [];
      
      // Calculate stats
      const myAssignedCalls = calls.filter(c => c.status === 'assigned').length;
      const myTodayPOA = calls.filter(c => 
        c.status === 'in_progress' || 
        (c.scheduled_date && new Date(c.scheduled_date).toDateString() === new Date().toDateString())
      ).length;
      const myCompletedToday = calls.filter(c =>
        c.status === 'completed' &&
        c.completed_at &&
        new Date(c.completed_at) >= today
      ).length;

      setEngineerStats({
        myAssignedCalls,
        myTodayPOA,
        myCompletedToday,
        myDevices: myDevices?.length || 0,
        pendingExpenses: myExpenses?.length || 0,
      });
    } catch (error) {
      console.error('Error loading engineer stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards: Array<{
    title: string;
    value: number;
    icon: typeof Smartphone;
    color: string;
    bgColor: string;
    statType: StatType;
  }> = [
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      icon: Smartphone,
      color: 'blue',
      bgColor: 'bg-blue-500',
      statType: 'totalDevices',
    },
    {
      title: 'Warehouse',
      value: stats.warehouseDevices,
      icon: Package,
      color: 'gray',
      bgColor: 'bg-gray-500',
      statType: 'warehouseDevices',
    },
    {
      title: 'Issued',
      value: stats.issuedDevices,
      icon: TrendingUp,
      color: 'yellow',
      bgColor: 'bg-yellow-500',
      statType: 'issuedDevices',
    },
    {
      title: 'Installed',
      value: stats.installedDevices,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500',
      statType: 'installedDevices',
    },
    {
      title: 'Faulty',
      value: stats.faultyDevices,
      icon: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-500',
      statType: 'faultyDevices',
    },
    {
      title: 'Active Calls',
      value: stats.activeCalls,
      icon: ClipboardList,
      color: 'blue',
      bgColor: 'bg-blue-500',
      statType: 'activeCalls',
    },
    {
      title: 'Pending',
      value: stats.pendingCalls,
      icon: Clock,
      color: 'orange',
      bgColor: 'bg-orange-500',
      statType: 'pendingCalls',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500',
      statType: 'completedToday',
    },
  ];

  if (isAdmin) {
    statCards.push({
      title: 'Total Engineers',
      value: stats.totalEngineers,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-500',
      statType: 'totalEngineers',
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
        <div className="mb-6 md:mb-8">
          {/* Engineer Stats Cards */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">My Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/fse/calls?tab=assigned"
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{engineerStats.myAssignedCalls}</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Assigned Calls</p>
              </Link>
              <Link
                to="/fse/calls"
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-400 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <PlayCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{engineerStats.myTodayPOA}</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Today's POA</p>
              </Link>
              <Link
                to="/fse/calls?tab=completed"
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-400 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-2xl font-bold text-green-600">{engineerStats.myCompletedToday}</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Completed Today</p>
              </Link>
              <Link
                to="/fse/inventory"
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-400 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-teal-100 p-2 rounded-lg">
                    <BoxIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-2xl font-bold text-teal-600">{engineerStats.myDevices}</span>
                </div>
                <p className="text-xs font-medium text-gray-600">My Devices</p>
              </Link>
            </div>
          </div>
          
          {/* Primary FSE Actions - Mobile-First Design */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/fse/calls"
                className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white hover:from-orange-600 hover:to-orange-700 transition group shadow-lg relative"
              >
                {engineerStats.myTodayPOA > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full shadow">
                    {engineerStats.myTodayPOA}
                  </span>
                )}
                <div className="flex items-center gap-4 min-h-[70px]">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <PlayCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Today's POA</h3>
                    <p className="text-orange-100 text-sm">Execute service calls</p>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </div>
              </Link>
              <Link
                to="/fse/inventory"
                className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-5 text-white hover:from-teal-600 hover:to-teal-700 transition group shadow-lg"
              >
                <div className="flex items-center gap-4 min-h-[70px]">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <RefreshCw className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Inventory</h3>
                    <p className="text-teal-100 text-sm">Stock & returns</p>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </div>
              </Link>
              <Link
                to="/fse/expenses"
                className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-5 text-white hover:from-purple-600 hover:to-purple-700 transition group shadow-lg relative"
              >
                {engineerStats.pendingExpenses > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded-full shadow">
                    {engineerStats.pendingExpenses}
                  </span>
                )}
                <div className="flex items-center gap-4 min-h-[70px]">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Receipt className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Expenses</h3>
                    <p className="text-purple-100 text-sm">Track & claim</p>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            </div>
          </div>
          
          {/* Secondary Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">More Options</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/fse/calls?tab=assigned"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition group"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition relative">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    {engineerStats.myAssignedCalls > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                        {engineerStats.myAssignedCalls}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Assigned</span>
                </div>
              </Link>
              <Link
                to="/fse/calls?tab=completed"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-md transition group"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Completed</span>
                </div>
              </Link>
              <Link
                to="/calls"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-md transition group"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">All Calls</span>
                </div>
              </Link>
              <Link
                to="/stock"
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-400 hover:shadow-md transition group"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="bg-amber-100 p-2 rounded-lg group-hover:bg-amber-200 transition">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">My Stock</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              onClick={() => setSelectedStat({ type: stat.statType, title: stat.title })}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer min-h-[110px] flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs md:text-sm font-medium text-gray-600 flex-1 pr-2 group-hover:text-blue-600 transition-colors">{stat.title}</p>
                <div className={`${stat.bgColor} p-2 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
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
                ({mapEngineers.filter(e => e.latitude).length} engineers, {mapCalls.filter(c => c.latitude).length} calls, {mapMerchants.length} merchants)
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
              merchants={mapMerchants}
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
                  { label: 'Warehouse', value: stats.warehouseDevices, total: stats.totalDevices, color: 'bg-gray-500', statType: 'warehouseDevices' as StatType },
                  { label: 'Issued', value: stats.issuedDevices, total: stats.totalDevices, color: 'bg-yellow-500', statType: 'issuedDevices' as StatType },
                  { label: 'Installed', value: stats.installedDevices, total: stats.totalDevices, color: 'bg-green-500', statType: 'installedDevices' as StatType },
                  { label: 'Faulty', value: stats.faultyDevices, total: stats.totalDevices, color: 'bg-red-500', statType: 'faultyDevices' as StatType },
                ].map((item) => {
                  const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
                  return (
                    <div 
                      key={item.label}
                      onClick={() => setSelectedStat({ type: item.statType, title: `${item.label} Devices` })}
                      className="cursor-pointer p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 group-hover:h-3 transition-all">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-300`}
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
                  { label: 'Pending', value: stats.pendingCalls, total: stats.activeCalls, color: 'bg-orange-500', statType: 'pendingCalls' as StatType },
                  { label: 'In Progress', value: stats.activeCalls - stats.pendingCalls, total: stats.activeCalls, color: 'bg-blue-500', statType: 'activeCalls' as StatType },
                  { label: 'Completed Today', value: stats.completedToday, total: stats.activeCalls + stats.completedToday, color: 'bg-green-500', statType: 'completedToday' as StatType },
                ].map((item) => {
                  const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
                  return (
                    <div 
                      key={item.label}
                      onClick={() => setSelectedStat({ type: item.statType, title: `${item.label} Calls` })}
                      className="cursor-pointer p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 group-hover:h-3 transition-all">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-300`}
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
              { label: 'Pending Calls', value: stats.pendingCalls, color: 'bg-orange-500', statType: 'pendingCalls' as StatType },
              { label: 'In Progress', value: stats.activeCalls - stats.pendingCalls, color: 'bg-blue-500', statType: 'activeCalls' as StatType },
              { label: 'Completed Today', value: stats.completedToday, color: 'bg-green-500', statType: 'completedToday' as StatType },
            ].map((item) => (
              <div 
                key={item.label} 
                onClick={() => setSelectedStat({ type: item.statType, title: item.label })}
                className="flex items-center justify-between p-4 md:p-5 bg-gray-50 rounded-lg min-h-[68px] cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">{item.value}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Detail Modal */}
      <StatDetailModal
        isOpen={selectedStat !== null}
        onClose={() => setSelectedStat(null)}
        statType={selectedStat?.type || 'totalDevices'}
        title={selectedStat?.title || ''}
      />
    </div>
  );
}
