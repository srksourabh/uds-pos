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
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  MapPin,
  Timer,
  AlertCircle,
  TrendingUp,
  XCircle
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
  AreaChart,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from 'recharts';

type TabType = 'overview' | 'calls' | 'sla' | 'aging' | 'regional' | 'engineers' | 'devices' | 'reconciliation';

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

// SLA definitions in hours by priority
const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 24,
  medium: 48,
  low: 72,
};

interface SLAStats {
  overall: { met: number; breached: number; rate: number };
  byPriority: Array<{ priority: string; met: number; breached: number; rate: number; slaHours: number }>;
  byBank: Array<{ bank: string; met: number; breached: number; rate: number }>;
  trend: Array<{ date: string; met: number; breached: number }>;
  breachedCalls: Array<{ id: string; call_number: string; priority: string; client_name: string; hoursOpen: number; slaHours: number }>;
}

interface AgingStats {
  buckets: Array<{ range: string; count: number; color: string }>;
  byPriority: Array<{ priority: string; '0-24h': number; '24-48h': number; '48-72h': number; '72h+': number }>;
  criticalCalls: Array<{ id: string; call_number: string; priority: string; client_name: string; city: string; hoursOpen: number; status: string }>;
}

interface RegionalStats {
  byCity: Array<{ city: string; total: number; completed: number; pending: number; rate: number }>;
  byState: Array<{ state: string; total: number; completed: number; rate: number }>;
  topPerformingCities: Array<{ city: string; rate: number; total: number }>;
  bottomPerformingCities: Array<{ city: string; rate: number; total: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const AGING_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

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
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [agingStats, setAgingStats] = useState<AgingStats | null>(null);
  const [regionalStats, setRegionalStats] = useState<RegionalStats | null>(null);
  
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
        loadSLAStats(),
        loadAgingStats(),
        loadRegionalStats(),
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

    const completed = calls.filter(c => c.status === 'completed');
    const durations = completed
      .filter(c => c.actual_duration_minutes)
      .map(c => c.actual_duration_minutes);
    
    const avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const byType: Record<string, number> = {};
    calls.forEach(c => {
      const type = c.type || c.call_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    const byPriority: Record<string, number> = {};
    calls.forEach(c => {
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });

    const byBank: Record<string, number> = {};
    calls.forEach(c => {
      const bankName = c.banks?.name || 'Unknown';
      byBank[bankName] = (byBank[bankName] || 0) + 1;
    });

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

  const loadSLAStats = async () => {
    let query = supabase
      .from('calls')
      .select('*, banks!client_bank(name)')
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
    
    if (selectedBank) {
      query = query.eq('client_bank', selectedBank);
    }

    const { data: calls } = await query;
    if (!calls) return;

    const now = new Date();
    
    // Calculate SLA for each call
    const callsWithSLA = calls.map(call => {
      const slaHours = SLA_HOURS[call.priority] || 72;
      const createdAt = new Date(call.created_at);
      const completedAt = call.completed_at ? new Date(call.completed_at) : now;
      const hoursOpen = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const slaMet = call.status === 'completed' ? hoursOpen <= slaHours : hoursOpen <= slaHours;
      
      return {
        ...call,
        slaHours,
        hoursOpen: Math.round(hoursOpen * 10) / 10,
        slaMet,
        slaBreached: !slaMet,
      };
    });

    // Overall stats
    const completedCalls = callsWithSLA.filter(c => c.status === 'completed');
    const metCount = completedCalls.filter(c => c.slaMet).length;
    const breachedCount = completedCalls.filter(c => c.slaBreached).length;

    // By Priority
    const priorities = ['urgent', 'high', 'medium', 'low'];
    const byPriority = priorities.map(priority => {
      const priorityCalls = completedCalls.filter(c => c.priority === priority);
      const met = priorityCalls.filter(c => c.slaMet).length;
      const breached = priorityCalls.filter(c => c.slaBreached).length;
      return {
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        met,
        breached,
        rate: priorityCalls.length > 0 ? Math.round((met / priorityCalls.length) * 100) : 0,
        slaHours: SLA_HOURS[priority],
      };
    });

    // By Bank
    const bankMap = new Map<string, { met: number; breached: number }>();
    completedCalls.forEach(call => {
      const bankName = call.banks?.name || 'Unknown';
      if (!bankMap.has(bankName)) {
        bankMap.set(bankName, { met: 0, breached: 0 });
      }
      const bankData = bankMap.get(bankName)!;
      if (call.slaMet) bankData.met++;
      else bankData.breached++;
    });
    const byBank = Array.from(bankMap.entries()).map(([bank, data]) => ({
      bank,
      ...data,
      rate: data.met + data.breached > 0 ? Math.round((data.met / (data.met + data.breached)) * 100) : 0,
    }));

    // Trend (daily)
    const trendMap = new Map<string, { met: number; breached: number }>();
    completedCalls.forEach(call => {
      const date = new Date(call.completed_at || call.created_at).toISOString().split('T')[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { met: 0, breached: 0 });
      }
      const dayData = trendMap.get(date)!;
      if (call.slaMet) dayData.met++;
      else dayData.breached++;
    });
    const trend = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14) // Last 14 days
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        ...data,
      }));

    // Breached calls list (active calls that have breached SLA)
    const breachedCalls = callsWithSLA
      .filter(c => c.slaBreached && c.status !== 'completed' && c.status !== 'cancelled')
      .sort((a, b) => b.hoursOpen - a.hoursOpen)
      .slice(0, 20)
      .map(c => ({
        id: c.id,
        call_number: c.call_number,
        priority: c.priority,
        client_name: c.client_name,
        hoursOpen: c.hoursOpen,
        slaHours: c.slaHours,
      }));

    setSlaStats({
      overall: {
        met: metCount,
        breached: breachedCount,
        rate: completedCalls.length > 0 ? Math.round((metCount / completedCalls.length) * 100) : 0,
      },
      byPriority,
      byBank,
      trend,
      breachedCalls,
    });
  };

  const loadAgingStats = async () => {
    // Get active calls (not completed, not cancelled)
    let query = supabase
      .from('calls')
      .select('*, banks!client_bank(name)')
      .in('status', ['pending', 'assigned', 'in_progress']);
    
    if (selectedBank) {
      query = query.eq('client_bank', selectedBank);
    }

    const { data: calls } = await query;
    if (!calls) return;

    const now = new Date();

    // Calculate hours open for each call
    const callsWithAge = calls.map(call => {
      const createdAt = new Date(call.created_at);
      const hoursOpen = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return {
        ...call,
        hoursOpen: Math.round(hoursOpen * 10) / 10,
      };
    });

    // Buckets
    const buckets = [
      { range: '0-24 hours', min: 0, max: 24, count: 0, color: '#10B981' },
      { range: '24-48 hours', min: 24, max: 48, count: 0, color: '#3B82F6' },
      { range: '48-72 hours', min: 48, max: 72, count: 0, color: '#F59E0B' },
      { range: '72+ hours', min: 72, max: Infinity, count: 0, color: '#EF4444' },
    ];

    callsWithAge.forEach(call => {
      for (const bucket of buckets) {
        if (call.hoursOpen >= bucket.min && call.hoursOpen < bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    // By Priority breakdown
    const priorities = ['urgent', 'high', 'medium', 'low'];
    const byPriority = priorities.map(priority => {
      const priorityCalls = callsWithAge.filter(c => c.priority === priority);
      return {
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        '0-24h': priorityCalls.filter(c => c.hoursOpen < 24).length,
        '24-48h': priorityCalls.filter(c => c.hoursOpen >= 24 && c.hoursOpen < 48).length,
        '48-72h': priorityCalls.filter(c => c.hoursOpen >= 48 && c.hoursOpen < 72).length,
        '72h+': priorityCalls.filter(c => c.hoursOpen >= 72).length,
      };
    });

    // Critical calls (oldest open calls)
    const criticalCalls = callsWithAge
      .sort((a, b) => b.hoursOpen - a.hoursOpen)
      .slice(0, 15)
      .map(c => ({
        id: c.id,
        call_number: c.call_number,
        priority: c.priority,
        client_name: c.client_name,
        city: c.client_city || 'N/A',
        hoursOpen: c.hoursOpen,
        status: c.status,
      }));

    setAgingStats({
      buckets: buckets.map(b => ({ range: b.range, count: b.count, color: b.color })),
      byPriority,
      criticalCalls,
    });
  };

  const loadRegionalStats = async () => {
    let query = supabase
      .from('calls')
      .select('*, banks!client_bank(name)')
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
    
    if (selectedBank) {
      query = query.eq('client_bank', selectedBank);
    }

    const { data: calls } = await query;
    if (!calls) return;

    // By City
    const cityMap = new Map<string, { total: number; completed: number; pending: number }>();
    calls.forEach(call => {
      const city = call.client_city || 'Unknown';
      if (!cityMap.has(city)) {
        cityMap.set(city, { total: 0, completed: 0, pending: 0 });
      }
      const cityData = cityMap.get(city)!;
      cityData.total++;
      if (call.status === 'completed') cityData.completed++;
      if (call.status === 'pending') cityData.pending++;
    });

    const byCity = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        ...data,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // By State
    const stateMap = new Map<string, { total: number; completed: number }>();
    calls.forEach(call => {
      const state = call.client_state || 'Unknown';
      if (!stateMap.has(state)) {
        stateMap.set(state, { total: 0, completed: 0 });
      }
      const stateData = stateMap.get(state)!;
      stateData.total++;
      if (call.status === 'completed') stateData.completed++;
    });

    const byState = Array.from(stateMap.entries())
      .map(([state, data]) => ({
        state,
        ...data,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Top and bottom performing cities (min 5 calls)
    const citiesWithMinCalls = byCity.filter(c => c.total >= 5);
    const topPerformingCities = [...citiesWithMinCalls]
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    const bottomPerformingCities = [...citiesWithMinCalls]
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    setRegionalStats({
      byCity: byCity.slice(0, 20),
      byState,
      topPerformingCities,
      bottomPerformingCities,
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

    stats.sort((a, b) => b.completedCalls - a.completedCalls);
    setEngineerStats(stats.slice(0, 20));
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

  const exportSLAReport = () => {
    if (!slaStats) return;
    
    let csv = 'SLA Compliance Report\n';
    csv += `Date Range,${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}\n\n`;
    csv += 'Overall\n';
    csv += `SLA Met,${slaStats.overall.met}\n`;
    csv += `SLA Breached,${slaStats.overall.breached}\n`;
    csv += `Compliance Rate,${slaStats.overall.rate}%\n\n`;
    csv += 'By Priority\n';
    csv += 'Priority,SLA Hours,Met,Breached,Rate\n';
    slaStats.byPriority.forEach(p => {
      csv += `${p.priority},${p.slaHours},${p.met},${p.breached},${p.rate}%\n`;
    });
    csv += '\nBy Bank\n';
    csv += 'Bank,Met,Breached,Rate\n';
    slaStats.byBank.forEach(b => {
      csv += `${b.bank},${b.met},${b.breached},${b.rate}%\n`;
    });
    
    downloadCSV(csv, `sla-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportAgingReport = () => {
    if (!agingStats) return;
    
    let csv = 'Aging Calls Report\n';
    csv += `Generated,${new Date().toLocaleString()}\n\n`;
    csv += 'By Age Bucket\n';
    csv += 'Range,Count\n';
    agingStats.buckets.forEach(b => {
      csv += `${b.range},${b.count}\n`;
    });
    csv += '\nCritical Calls (Oldest Open)\n';
    csv += 'Call Number,Priority,Client,City,Hours Open,Status\n';
    agingStats.criticalCalls.forEach(c => {
      csv += `${c.call_number},${c.priority},${c.client_name},${c.city},${c.hoursOpen},${c.status}\n`;
    });
    
    downloadCSV(csv, `aging-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportRegionalReport = () => {
    if (!regionalStats) return;
    
    let csv = 'Regional Performance Report\n';
    csv += `Date Range,${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}\n\n`;
    csv += 'By City\n';
    csv += 'City,Total Calls,Completed,Pending,Completion Rate\n';
    regionalStats.byCity.forEach(c => {
      csv += `${c.city},${c.total},${c.completed},${c.pending},${c.rate}%\n`;
    });
    csv += '\nBy State\n';
    csv += 'State,Total Calls,Completed,Completion Rate\n';
    regionalStats.byState.forEach(s => {
      csv += `${s.state},${s.total},${s.completed},${s.rate}%\n`;
    });
    
    downloadCSV(csv, `regional-report-${new Date().toISOString().split('T')[0]}.csv`);
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
    { id: 'sla', label: 'SLA', icon: Shield },
    { id: 'aging', label: 'Aging', icon: Timer },
    { id: 'regional', label: 'Regional', icon: MapPin },
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
          <p className="text-gray-600 mt-1">Analytics, SLA tracking, and performance insights</p>
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
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">SLA Compliance</p>
                      <p className="text-2xl font-bold text-gray-900">{slaStats?.overall.rate || 0}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Timer className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aging (72h+)</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {agingStats?.buckets.find(b => b.range === '72+ hours')?.count || 0}
                      </p>
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
                        <Cell fill="#9CA3AF" />
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
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

          {/* SLA Tab */}
          {activeTab === 'sla' && slaStats && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="bg-blue-50 rounded-lg p-4 flex-1 mr-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">SLA Definitions</h3>
                  <div className="flex gap-4 text-sm text-blue-700">
                    <span><strong>Urgent:</strong> {SLA_HOURS.urgent}h</span>
                    <span><strong>High:</strong> {SLA_HOURS.high}h</span>
                    <span><strong>Medium:</strong> {SLA_HOURS.medium}h</span>
                    <span><strong>Low:</strong> {SLA_HOURS.low}h</span>
                  </div>
                </div>
                <button
                  onClick={exportSLAReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Overall SLA */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Compliance</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="12"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke={slaStats.overall.rate >= 90 ? '#10B981' : slaStats.overall.rate >= 70 ? '#F59E0B' : '#EF4444'}
                          strokeWidth="12"
                          strokeDasharray={`${(slaStats.overall.rate / 100) * 440} 440`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-900">{slaStats.overall.rate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Met: {slaStats.overall.met}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>Breached: {slaStats.overall.breached}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA by Priority</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={slaStats.byPriority} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="priority" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="met" stackId="a" fill="#10B981" name="Met" />
                      <Bar dataKey="breached" stackId="a" fill="#EF4444" name="Breached" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SLA by Bank */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Compliance by Bank</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Met</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Breached</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Compliance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {slaStats.byBank.map((bank) => (
                        <tr key={bank.bank} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{bank.bank}</td>
                          <td className="px-4 py-3 text-center text-green-600">{bank.met}</td>
                          <td className="px-4 py-3 text-center text-red-600">{bank.breached}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              bank.rate >= 90 ? 'bg-green-100 text-green-700' :
                              bank.rate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {bank.rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 w-40">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  bank.rate >= 90 ? 'bg-green-500' :
                                  bank.rate >= 70 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${bank.rate}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breached Calls */}
              {slaStats.breachedCalls.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Active SLA Breaches</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Call #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Priority</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Client</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase">SLA</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase">Hours Open</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase">Overdue By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {slaStats.breachedCalls.map((call) => (
                          <tr key={call.id} className="hover:bg-red-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{call.call_number}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                call.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                call.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                call.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {call.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{call.client_name}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{call.slaHours}h</td>
                            <td className="px-4 py-3 text-center font-medium text-red-600">{call.hoursOpen}h</td>
                            <td className="px-4 py-3 text-center font-bold text-red-700">
                              +{(call.hoursOpen - call.slaHours).toFixed(1)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SLA Trend */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Trend (Last 14 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={slaStats.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="met" fill="#10B981" name="SLA Met" />
                    <Bar dataKey="breached" fill="#EF4444" name="SLA Breached" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Aging Tab */}
          {activeTab === 'aging' && agingStats && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={exportAgingReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Aging Buckets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {agingStats.buckets.map((bucket) => (
                  <div 
                    key={bucket.range} 
                    className="bg-white rounded-xl shadow-sm border-2 p-4"
                    style={{ borderColor: bucket.color }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${bucket.color}20` }}
                      >
                        <Clock className="w-6 h-6" style={{ color: bucket.color }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{bucket.range}</p>
                        <p className="text-3xl font-bold" style={{ color: bucket.color }}>{bucket.count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Aging by Priority */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging by Priority</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agingStats.byPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="0-24h" stackId="a" fill="#10B981" name="0-24 hours" />
                    <Bar dataKey="24-48h" stackId="a" fill="#3B82F6" name="24-48 hours" />
                    <Bar dataKey="48-72h" stackId="a" fill="#F59E0B" name="48-72 hours" />
                    <Bar dataKey="72h+" stackId="a" fill="#EF4444" name="72+ hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Aging Distribution Pie */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={agingStats.buckets}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, count }) => count > 0 ? `${range}: ${count}` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {agingStats.buckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Summary</h3>
                  <div className="space-y-4">
                    {agingStats.buckets.map((bucket) => {
                      const total = agingStats.buckets.reduce((sum, b) => sum + b.count, 0);
                      const percentage = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
                      return (
                        <div key={bucket.range}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{bucket.range}</span>
                            <span className="font-medium">{bucket.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: bucket.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Critical Calls Table */}
              <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Oldest Open Calls</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-700 uppercase">Call #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-700 uppercase">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-700 uppercase">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-700 uppercase">City</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orange-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orange-700 uppercase">Hours Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {agingStats.criticalCalls.map((call) => (
                        <tr key={call.id} className="hover:bg-orange-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{call.call_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              call.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              call.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              call.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {call.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{call.client_name}</td>
                          <td className="px-4 py-3 text-gray-600">{call.city}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              call.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                              call.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {call.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${
                              call.hoursOpen >= 72 ? 'text-red-600' :
                              call.hoursOpen >= 48 ? 'text-orange-600' :
                              'text-blue-600'
                            }`}>
                              {call.hoursOpen}h
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

          {/* Regional Tab */}
          {activeTab === 'regional' && regionalStats && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={exportRegionalReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Top & Bottom Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Top Performing Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {regionalStats.topPerformingCities.map((city, idx) => (
                      <div key={city.city} className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">{city.city}</span>
                            <span className="text-green-600 font-bold">{city.rate}%</span>
                          </div>
                          <div className="text-xs text-gray-500">{city.total} calls</div>
                        </div>
                      </div>
                    ))}
                    {regionalStats.topPerformingCities.length === 0 && (
                      <p className="text-gray-500 text-sm">Not enough data (min 5 calls per city)</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Needs Improvement</h3>
                  </div>
                  <div className="space-y-3">
                    {regionalStats.bottomPerformingCities.map((city, idx) => (
                      <div key={city.city} className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">{city.city}</span>
                            <span className="text-red-600 font-bold">{city.rate}%</span>
                          </div>
                          <div className="text-xs text-gray-500">{city.total} calls</div>
                        </div>
                      </div>
                    ))}
                    {regionalStats.bottomPerformingCities.length === 0 && (
                      <p className="text-gray-500 text-sm">Not enough data (min 5 calls per city)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* By State Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by State</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionalStats.byState}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="total" fill="#93C5FD" name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* By City Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Cities</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completed</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pending</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {regionalStats.byCity.map((city) => (
                        <tr key={city.city} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{city.city}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{city.total}</td>
                          <td className="px-4 py-3 text-center text-green-600">{city.completed}</td>
                          <td className="px-4 py-3 text-center text-orange-600">{city.pending}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              city.rate >= 80 ? 'bg-green-100 text-green-700' :
                              city.rate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {city.rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 w-32">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  city.rate >= 80 ? 'bg-green-500' :
                                  city.rate >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${city.rate}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
