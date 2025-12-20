import { useState, useEffect, useMemo } from 'react';
import { useReconciliationExport } from '../lib/api-hooks';
import { supabase } from '../lib/supabase';
import { DateRangePicker } from '../components/DateRangePicker';
import { 
  Download, 
  FileText, 
  Filter, 
  Loader,
  BarChart3,
  Users,
  Smartphone,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

type TabType = 'overview' | 'calls' | 'engineers' | 'devices' | 'reconciliation';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface CallStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  avgDuration: number;
  completionRate: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byBank: Record<string, number>;
  trend: Array<{ date: string; completed: number; created: number }>;
}

interface EngineerStats {
  id: string;
  name: string;
  completedCalls: number;
  avgDuration: number;
  activeDevices: number;
  completionRate: number;
}

interface DeviceStats {
  total: number;
  byStatus: Record<string, number>;
  byBank: Record<string, number>;
  byModel: Record<string, number>;
  movements: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function Reports() {
  const { exportReconciliation, loading: exportLoading } = useReconciliationExport();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  });
  
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Report data
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  const [engineerStats, setEngineerStats] = useState<EngineerStats[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  
  // Reconciliation
  const [reconciliationFilters, setReconciliationFilters] = useState({
    bankId: '',
    includeMovements: false,
  });
  const [exportResult, setExportResult] = useState<any>(null);

  useEffect(() => {
    supabase.from('banks').select('*').then(({ data }) => setBanks(data || []));
  }, []);

  useEffect(() => {
    loadReportData();
  }, [dateRange, selectedBank]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCallStats(),
        loadEngineerStats(),
        loadDeviceStats(),
      ]);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const loadCallStats = async () => {
    let query = supabase
      .from('calls')
      .select('*, banks!client_bank(name), user_profiles!assigned_engineer(full_name)')
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
    
    if (selectedBank) {
      query = query.eq('client_bank', selectedBank);
    }

    const { data: calls } = await query;
    
    if (!calls) return;

    // Calculate stats
    const completed = calls.filter(c => c.status === 'completed');
    const durations = completed
      .filter(c => c.actual_duration_minutes)
      .map(c => c.actual_duration_minutes);
    
    const avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Group by type
    const byType: Record<string, number> = {};
    calls.forEach(c => {
      const type = c.type || c.call_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Group by priority
    const byPriority: Record<string, number> = {};
    calls.forEach(c => {
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });

    // Group by bank
    const byBank: Record<string, number> = {};
    calls.forEach(c => {
      const bankName = c.banks?.name || 'Unknown';
      byBank[bankName] = (byBank[bankName] || 0) + 1;
    });

    // Calculate trend (daily)
    const trendMap = new Map<string, { completed: number; created: number }>();
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      trendMap.set(dateKey, { completed: 0, created: 0 });
    }

    calls.forEach(c => {
      const createdDate = new Date(c.created_at).toISOString().split('T')[0];
      if (trendMap.has(createdDate)) {
        const current = trendMap.get(createdDate)!;
        current.created++;
        if (c.status === 'completed') {
          const completedDate = c.completed_at 
            ? new Date(c.completed_at).toISOString().split('T')[0]
            : createdDate;
          if (trendMap.has(completedDate)) {
            trendMap.get(completedDate)!.completed++;
          }
        }
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...data,
    }));

    setCallStats({
      total: calls.length,
      completed: completed.length,
      pending: calls.filter(c => c.status === 'pending').length,
      inProgress: calls.filter(c => c.status === 'in_progress').length,
      cancelled: calls.filter(c => c.status === 'cancelled').length,
      avgDuration,
      completionRate: calls.length > 0 ? Math.round((completed.length / calls.length) * 100) : 0,
      byType,
      byPriority,
      byBank,
      trend,
    });
  };

  const loadEngineerStats = async () => {
    const { data: engineers } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('role', 'engineer');

    if (!engineers) return;

    let callsQuery = supabase
      .from('calls')
      .select('assigned_engineer, status, actual_duration_minutes')
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate)
      .not('assigned_engineer', 'is', null);

    if (selectedBank) {
      callsQuery = callsQuery.eq('client_bank', selectedBank);
    }

    const { data: calls } = await callsQuery;

    const { data: devices } = await supabase
      .from('devices')
      .select('assigned_engineer')
      .eq('status', 'issued');

    const stats: EngineerStats[] = engineers.map(eng => {
      const engCalls = (calls || []).filter(c => c.assigned_engineer === eng.id);
      const completed = engCalls.filter(c => c.status === 'completed');
      const durations = completed
        .filter(c => c.actual_duration_minutes)
        .map(c => c.actual_duration_minutes);
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      const activeDevices = (devices || []).filter(d => d.assigned_engineer === eng.id).length;

      return {
        id: eng.id,
        name: eng.full_name || 'Unknown',
        completedCalls: completed.length,
        avgDuration,
        activeDevices,
        completionRate: engCalls.length > 0 ? Math.round((completed.length / engCalls.length) * 100) : 0,
      };
    });

    // Sort by completed calls descending
    stats.sort((a, b) => b.completedCalls - a.completedCalls);
    setEngineerStats(stats.slice(0, 20)); // Top 20
  };

  const loadDeviceStats = async () => {
    let devicesQuery = supabase
      .from('devices')
      .select('status, model, banks!device_bank(name)');

    if (selectedBank) {
      devicesQuery = devicesQuery.eq('device_bank', selectedBank);
    }

    const { data: devices } = await devicesQuery;

    let movementsQuery = supabase
      .from('stock_movements')
      .select('id', { count: 'exact' })
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);

    const { count: movements } = await movementsQuery;

    if (!devices) return;

    const byStatus: Record<string, number> = {};
    const byBank: Record<string, number> = {};
    const byModel: Record<string, number> = {};

    devices.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      const bankName = d.banks?.name || 'Unknown';
      byBank[bankName] = (byBank[bankName] || 0) + 1;
      const model = d.model || 'Unknown';
      byModel[model] = (byModel[model] || 0) + 1;
    });

    setDeviceStats({
      total: devices.length,
      byStatus,
      byBank,
      byModel,
      movements: movements || 0,
    });
  };

  const handleExport = async () => {
    try {
      const params: any = {
        startDate: dateRange.startDate.split('T')[0],
        endDate: dateRange.endDate.split('T')[0],
      };
      if (reconciliationFilters.bankId) params.bankId = reconciliationFilters.bankId;
      if (reconciliationFilters.includeMovements) params.includeMovements = true;

      const result = await exportReconciliation(params);
      setExportResult(result);
    } catch (error: any) {
      alert(`Export failed: ${error.error || error.message}`);
    }
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportCallsReport = () => {
    if (!callStats) return;
    
    let csv = 'Call Report\n';
    csv += `Date Range,${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}\n\n`;
    csv += 'Summary\n';
    csv += `Total Calls,${callStats.total}\n`;
    csv += `Completed,${callStats.completed}\n`;
    csv += `Completion Rate,${callStats.completionRate}%\n`;
    csv += `Average Duration,${callStats.avgDuration} min\n\n`;
    csv += 'By Type\n';
    Object.entries(callStats.byType).forEach(([type, count]) => {
      csv += `${type},${count}\n`;
    });
    csv += '\nBy Priority\n';
    Object.entries(callStats.byPriority).forEach(([priority, count]) => {
      csv += `${priority},${count}\n`;
    });
    csv += '\nBy Bank\n';
    Object.entries(callStats.byBank).forEach(([bank, count]) => {
      csv += `${bank},${count}\n`;
    });
    
    downloadCSV(csv, `calls-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportEngineersReport = () => {
    let csv = 'Engineer,Completed Calls,Avg Duration (min),Active Devices,Completion Rate\n';
    engineerStats.forEach(eng => {
      csv += `${eng.name},${eng.completedCalls},${eng.avgDuration},${eng.activeDevices},${eng.completionRate}%\n`;
    });
    downloadCSV(csv, `engineers-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Chart data transformations
  const typeChartData = useMemo(() => {
    if (!callStats) return [];
    return Object.entries(callStats.byType).map(([name, value]) => ({ name, value }));
  }, [callStats]);

  const priorityChartData = useMemo(() => {
    if (!callStats) return [];
    return Object.entries(callStats.byPriority).map(([name, value]) => ({ name, value }));
  }, [callStats]);

  const bankChartData = useMemo(() => {
    if (!callStats) return [];
    return Object.entries(callStats.byBank).map(([name, value]) => ({ name, value }));
  }, [callStats]);

  const deviceStatusData = useMemo(() => {
    if (!deviceStats) return [];
    return Object.entries(deviceStats.byStatus).map(([name, value]) => ({ name, value }));
  }, [deviceStats]);

  const tabs: { id: TabType; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'calls', label: 'Calls', icon: ClipboardList },
    { id: 'engineers', label: 'Engineers', icon: Users },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'reconciliation', label: 'Reconciliation', icon: FileText },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Advanced Reports</h1>
          <p className="text-gray-600 mt-1">Analytics, insights, and data exports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Bank Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filter by Bank:</span>
        </div>
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Banks</option>
          {banks.map(bank => (
            <option key={bank.id} value={bank.id}>{bank.name} ({bank.code})</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && callStats && deviceStats && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <ClipboardList className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Calls</p>
                      <p className="text-2xl font-bold text-gray-900">{callStats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{callStats.completionRate}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Duration</p>
                      <p className="text-2xl font-bold text-gray-900">{callStats.avgDuration} min</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Smartphone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Devices</p>
                      <p className="text-2xl font-bold text-gray-900">{deviceStats.total}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calls Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={callStats.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="created" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Created" />
                    <Area type="monotone" dataKey="completed" stackId="2" stroke="#10B981" fill="#6EE7B7" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Calls by Type</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Calls by Bank</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bankChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === 'calls' && callStats && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={exportCallsReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{callStats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{callStats.completed}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{callStats.inProgress}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{callStats.pending}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">{callStats.cancelled}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Priority</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#9CA3AF" /> {/* low - gray */}
                        <Cell fill="#3B82F6" /> {/* medium - blue */}
                        <Cell fill="#F59E0B" /> {/* high - orange */}
                        <Cell fill="#EF4444" /> {/* urgent - red */}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Type</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={typeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={callStats.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Engineers Tab */}
          {activeTab === 'engineers' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={exportEngineersReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Top Performers Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers (by Completed Calls)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={engineerStats.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="completedCalls" fill="#10B981" radius={[0, 4, 4, 0]} name="Completed Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Engineers Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engineer</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completed</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active Devices</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {engineerStats.map((eng, idx) => (
                        <tr key={eng.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                                idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-medium text-gray-900">{eng.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{eng.completedCalls}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{eng.avgDuration} min</td>
                          <td className="px-4 py-3 text-center text-gray-600">{eng.activeDevices}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              eng.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                              eng.completionRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {eng.completionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && deviceStats && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Total Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{deviceStats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">In Warehouse</p>
                  <p className="text-2xl font-bold text-gray-600">{deviceStats.byStatus.warehouse || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Installed</p>
                  <p className="text-2xl font-bold text-green-600">{deviceStats.byStatus.installed || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <p className="text-sm text-gray-500">Movements (Period)</p>
                  <p className="text-2xl font-bold text-blue-600">{deviceStats.movements}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Status</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deviceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Bank</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={Object.entries(deviceStats.byBank).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Models Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Model</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(deviceStats.byModel)
                    .sort((a, b) => b[1] - a[1])
                    .map(([model, count]) => (
                      <div key={model} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">{model}</p>
                        <p className="text-xl font-bold text-gray-900">{count}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Tab */}
          {activeTab === 'reconciliation' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Export</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Export device inventory and stock movements for reconciliation and auditing purposes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Filter className="w-4 h-4 inline mr-1" />
                      Filter by Bank
                    </label>
                    <select
                      value={reconciliationFilters.bankId}
                      onChange={(e) => setReconciliationFilters({ ...reconciliationFilters, bankId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Banks</option>
                      {banks.map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.name} ({bank.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="includeMovements"
                        checked={reconciliationFilters.includeMovements}
                        onChange={(e) => setReconciliationFilters({ ...reconciliationFilters, includeMovements: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="includeMovements" className="text-sm text-gray-700">
                        Include stock movements (up to 10,000 records)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {exportLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate Export
                      </>
                    )}
                  </button>
                </div>
              </div>

              {exportResult && (
                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Export Complete</h2>
                    <p className="text-sm text-gray-600">Generated on {new Date().toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium mb-1">Total Devices</div>
                      <div className="text-2xl font-bold text-blue-900">{exportResult.deviceCount}</div>
                    </div>
                    {exportResult.movementCount > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600 font-medium mb-1">Stock Movements</div>
                        <div className="text-2xl font-bold text-green-900">{exportResult.movementCount}</div>
                      </div>
                    )}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium mb-1">File Size</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {((exportResult.devicesCsv.length + (exportResult.movementsCsv?.length || 0)) / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => downloadCSV(exportResult.devicesCsv, exportResult.filename)}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Download Devices CSV
                    </button>
                    {exportResult.movementsCsv && (
                      <button
                        onClick={() => downloadCSV(exportResult.movementsCsv, exportResult.filename.replace('.csv', '-movements.csv'))}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        Download Movements CSV
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
