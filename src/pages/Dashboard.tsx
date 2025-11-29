import { useEffect, useState } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { CallsTrendChart } from '../components/charts/CallsTrendChart';
import { DeviceDistributionChart } from '../components/charts/DeviceDistributionChart';
import { PriorityPieChart } from '../components/charts/PriorityPieChart';

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

export function Dashboard() {
  const { profile, isAdmin } = useAuth();
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

  useEffect(() => {
    loadDashboardStats();
    loadChartData();

    const devicesChannel = supabase
      .channel('dashboard-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        loadDashboardStats();
        loadChartData();
      })
      .subscribe();

    const callsChannel = supabase
      .channel('dashboard-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        loadDashboardStats();
        loadChartData();
      })
      .subscribe();

    return () => {
      devicesChannel.unsubscribe();
      callsChannel.unsubscribe();
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [devicesRes, callsRes, engineersRes] = await Promise.all([
        supabase.from('devices').select('status'),
        supabase.from('calls').select('status, completed_at'),
        isAdmin ? supabase.from('user_profiles').select('id').eq('role', 'engineer') : Promise.resolve({ data: [] })
      ]);

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name}
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your field service operations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Calls Trend (Last 7 Days)</h2>
          <CallsTrendChart data={callsTrendData} loading={chartsLoading} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Calls by Priority</h2>
          <PriorityPieChart data={priorityData} loading={chartsLoading} />
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution by Bank</h2>
        <DeviceDistributionChart data={deviceDistData} loading={chartsLoading} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Status Overview</h2>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Status Overview</h2>
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
    </div>
  );
}
