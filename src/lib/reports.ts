import { supabase } from './supabase';

// Types for reports
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CallMetrics {
  totalCalls: number;
  completedCalls: number;
  pendingCalls: number;
  inProgressCalls: number;
  cancelledCalls: number;
  completionRate: number;
  avgResolutionTime: number; // in hours
  callsByPriority: { priority: string; count: number }[];
  callsByType: { type: string; count: number }[];
  callsByBank: { bank: string; count: number }[];
  callsByRegion: { region: string; count: number }[];
  dailyTrend: { date: string; created: number; completed: number }[];
}

export interface EngineerMetrics {
  totalEngineers: number;
  activeEngineers: number;
  engineerPerformance: {
    id: string;
    name: string;
    totalCalls: number;
    completedCalls: number;
    avgResolutionTime: number;
    completionRate: number;
    rating: number;
  }[];
  topPerformers: { name: string; completedCalls: number }[];
  workloadDistribution: { name: string; activeCalls: number }[];
  regionDistribution: { region: string; count: number }[];
}

export interface DeviceMetrics {
  totalDevices: number;
  warehouseDevices: number;
  issuedDevices: number;
  installedDevices: number;
  faultyDevices: number;
  devicesByBank: { bank: string; count: number }[];
  devicesByBrand: { brand: string; count: number }[];
  devicesByStatus: { status: string; count: number }[];
  installationTrend: { date: string; installed: number }[];
  deviceAging: { ageRange: string; count: number }[];
}

export interface StockMetrics {
  totalStock: number;
  inTransit: number;
  received: number;
  pending: number;
  stockByWarehouse: { warehouse: string; count: number }[];
  recentMovements: {
    id: string;
    date: string;
    type: string;
    quantity: number;
    from: string;
    to: string;
  }[];
  stockTrend: { date: string; inbound: number; outbound: number }[];
}

// Helper to get date range SQL
const getDateRangeFilter = (column: string, range: DateRange) => {
  return `${column} >= '${range.startDate}' AND ${column} <= '${range.endDate}'`;
};

// Get Call Metrics
export async function getCallMetrics(dateRange?: DateRange): Promise<CallMetrics> {
  try {
    // Base query for calls
    let query = supabase.from('calls').select('*');
    
    if (dateRange) {
      query = query.gte('created_at', dateRange.startDate).lte('created_at', dateRange.endDate);
    }

    const { data: calls, error } = await query;
    if (error) throw error;

    const allCalls = calls || [];
    const totalCalls = allCalls.length;
    const completedCalls = allCalls.filter(c => c.status === 'completed').length;
    const pendingCalls = allCalls.filter(c => c.status === 'pending').length;
    const inProgressCalls = allCalls.filter(c => c.status === 'in_progress').length;
    const cancelledCalls = allCalls.filter(c => c.status === 'cancelled').length;

    // Calculate average resolution time (for completed calls)
    const completedWithTime = allCalls.filter(c => c.status === 'completed' && c.started_at && c.completed_at);
    const avgResolutionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, c) => {
          const start = new Date(c.started_at).getTime();
          const end = new Date(c.completed_at).getTime();
          return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
        }, 0) / completedWithTime.length
      : 0;

    // Group by priority
    const priorityCounts: Record<string, number> = {};
    allCalls.forEach(c => {
      const priority = c.priority || 'unknown';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    // Group by type
    const typeCounts: Record<string, number> = {};
    allCalls.forEach(c => {
      const type = c.call_type || c.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Group by bank (need to fetch bank names)
    const { data: banks } = await supabase.from('banks').select('id, name');
    const bankMap = new Map((banks || []).map(b => [b.id, b.name]));
    
    const bankCounts: Record<string, number> = {};
    allCalls.forEach(c => {
      const bankName = bankMap.get(c.client_bank) || 'Unknown';
      bankCounts[bankName] = (bankCounts[bankName] || 0) + 1;
    });

    // Group by region/city
    const regionCounts: Record<string, number> = {};
    allCalls.forEach(c => {
      const region = c.city || c.client_city || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // Daily trend (last 30 days or within date range)
    const trendDays = 30;
    const dailyTrend: { date: string; created: number; completed: number }[] = [];
    const now = new Date();
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const created = allCalls.filter(c => 
        c.created_at && c.created_at.startsWith(dateStr)
      ).length;
      
      const completed = allCalls.filter(c => 
        c.completed_at && c.completed_at.startsWith(dateStr)
      ).length;
      
      dailyTrend.push({ date: dateStr, created, completed });
    }

    return {
      totalCalls,
      completedCalls,
      pendingCalls,
      inProgressCalls,
      cancelledCalls,
      completionRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      callsByPriority: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
      callsByType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
      callsByBank: Object.entries(bankCounts).map(([bank, count]) => ({ bank, count })).sort((a, b) => b.count - a.count),
      callsByRegion: Object.entries(regionCounts).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      dailyTrend,
    };
  } catch (error) {
    console.error('Error fetching call metrics:', error);
    throw error;
  }
}

// Get Engineer Metrics
export async function getEngineerMetrics(dateRange?: DateRange): Promise<EngineerMetrics> {
  try {
    // Fetch all engineers
    const { data: engineers, error: engError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, city, status')
      .eq('role', 'engineer');
    
    if (engError) throw engError;

    const allEngineers = engineers || [];
    const totalEngineers = allEngineers.length;
    const activeEngineers = allEngineers.filter(e => e.status === 'active').length;

    // Fetch calls for performance metrics
    let callsQuery = supabase.from('calls').select('*');
    if (dateRange) {
      callsQuery = callsQuery.gte('created_at', dateRange.startDate).lte('created_at', dateRange.endDate);
    }
    const { data: calls } = await callsQuery;
    const allCalls = calls || [];

    // Calculate performance per engineer
    const engineerPerformance = allEngineers.map(eng => {
      const engCalls = allCalls.filter(c => c.assigned_engineer === eng.id);
      const completedCalls = engCalls.filter(c => c.status === 'completed').length;
      const totalCalls = engCalls.length;
      
      // Calculate avg resolution time
      const completedWithTime = engCalls.filter(c => c.status === 'completed' && c.started_at && c.completed_at);
      const avgResolutionTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, c) => {
            const start = new Date(c.started_at).getTime();
            const end = new Date(c.completed_at).getTime();
            return sum + (end - start) / (1000 * 60 * 60);
          }, 0) / completedWithTime.length
        : 0;

      return {
        id: eng.id,
        name: eng.full_name || eng.email || 'Unknown',
        totalCalls,
        completedCalls,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        completionRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
        rating: 0, // Placeholder for future rating system
      };
    });

    // Top performers by completed calls
    const topPerformers = [...engineerPerformance]
      .sort((a, b) => b.completedCalls - a.completedCalls)
      .slice(0, 10)
      .map(e => ({ name: e.name, completedCalls: e.completedCalls }));

    // Current workload (active calls)
    const workloadDistribution = engineerPerformance
      .map(eng => {
        const activeCalls = allCalls.filter(c => 
          c.assigned_engineer === eng.id && 
          ['assigned', 'in_progress'].includes(c.status)
        ).length;
        return { name: eng.name, activeCalls };
      })
      .filter(w => w.activeCalls > 0)
      .sort((a, b) => b.activeCalls - a.activeCalls)
      .slice(0, 15);

    // Region distribution
    const regionCounts: Record<string, number> = {};
    allEngineers.forEach(e => {
      const region = e.city || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    return {
      totalEngineers,
      activeEngineers,
      engineerPerformance: engineerPerformance.sort((a, b) => b.completedCalls - a.completedCalls),
      topPerformers,
      workloadDistribution,
      regionDistribution: Object.entries(regionCounts).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.error('Error fetching engineer metrics:', error);
    throw error;
  }
}

// Get Device Metrics
export async function getDeviceMetrics(dateRange?: DateRange): Promise<DeviceMetrics> {
  try {
    const { data: devices, error } = await supabase.from('devices').select('*');
    if (error) throw error;

    const allDevices = devices || [];
    const totalDevices = allDevices.length;
    const warehouseDevices = allDevices.filter(d => d.status === 'warehouse').length;
    const issuedDevices = allDevices.filter(d => d.status === 'issued').length;
    const installedDevices = allDevices.filter(d => d.status === 'installed').length;
    const faultyDevices = allDevices.filter(d => d.status === 'faulty').length;

    // Fetch banks for device distribution
    const { data: banks } = await supabase.from('banks').select('id, name');
    const bankMap = new Map((banks || []).map(b => [b.id, b.name]));

    // Group by bank
    const bankCounts: Record<string, number> = {};
    allDevices.forEach(d => {
      const bankName = bankMap.get(d.bank_id) || 'Unknown';
      bankCounts[bankName] = (bankCounts[bankName] || 0) + 1;
    });

    // Group by brand
    const brandCounts: Record<string, number> = {};
    allDevices.forEach(d => {
      const brand = d.brand || 'Unknown';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });

    // Group by status
    const statusCounts: Record<string, number> = {};
    allDevices.forEach(d => {
      const status = d.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Installation trend (based on installed_at if available, or updated_at)
    const trendDays = 30;
    const installationTrend: { date: string; installed: number }[] = [];
    const now = new Date();
    
    const installedDevicesList = allDevices.filter(d => d.status === 'installed');
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const installed = installedDevicesList.filter(d => 
        (d.installed_at && d.installed_at.startsWith(dateStr)) ||
        (d.updated_at && d.updated_at.startsWith(dateStr) && !d.installed_at)
      ).length;
      
      installationTrend.push({ date: dateStr, installed });
    }

    // Device aging (based on created_at)
    const agingRanges = [
      { label: '< 30 days', maxDays: 30 },
      { label: '30-90 days', maxDays: 90 },
      { label: '90-180 days', maxDays: 180 },
      { label: '180-365 days', maxDays: 365 },
      { label: '> 1 year', maxDays: Infinity },
    ];

    const deviceAging = agingRanges.map((range, idx) => {
      const minDays = idx === 0 ? 0 : agingRanges[idx - 1].maxDays;
      const count = allDevices.filter(d => {
        if (!d.created_at) return false;
        const age = (now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return age >= minDays && age < range.maxDays;
      }).length;
      return { ageRange: range.label, count };
    });

    return {
      totalDevices,
      warehouseDevices,
      issuedDevices,
      installedDevices,
      faultyDevices,
      devicesByBank: Object.entries(bankCounts).map(([bank, count]) => ({ bank, count })).sort((a, b) => b.count - a.count),
      devicesByBrand: Object.entries(brandCounts).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count),
      devicesByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      installationTrend,
      deviceAging,
    };
  } catch (error) {
    console.error('Error fetching device metrics:', error);
    throw error;
  }
}

// Get Stock Metrics
export async function getStockMetrics(dateRange?: DateRange): Promise<StockMetrics> {
  try {
    // Fetch stock movements
    let movementsQuery = supabase.from('stock_movements').select('*').order('created_at', { ascending: false });
    if (dateRange) {
      movementsQuery = movementsQuery.gte('created_at', dateRange.startDate).lte('created_at', dateRange.endDate);
    }
    const { data: movements } = await movementsQuery;
    const allMovements = movements || [];

    // Fetch warehouses
    const { data: warehouses } = await supabase.from('warehouses').select('id, name');
    const warehouseMap = new Map((warehouses || []).map(w => [w.id, w.name]));

    // Fetch devices for stock counts
    const { data: devices } = await supabase.from('devices').select('id, status, warehouse_id');
    const allDevices = devices || [];

    const totalStock = allDevices.filter(d => d.status === 'warehouse').length;
    const inTransit = allMovements.filter(m => m.status === 'in_transit').length;
    const received = allMovements.filter(m => m.status === 'received').length;
    const pending = allMovements.filter(m => m.status === 'pending').length;

    // Stock by warehouse
    const warehouseCounts: Record<string, number> = {};
    allDevices.filter(d => d.status === 'warehouse').forEach(d => {
      const whName = warehouseMap.get(d.warehouse_id) || 'Unknown';
      warehouseCounts[whName] = (warehouseCounts[whName] || 0) + 1;
    });

    // Recent movements
    const recentMovements = allMovements.slice(0, 20).map(m => ({
      id: m.id,
      date: m.created_at,
      type: m.movement_type || 'transfer',
      quantity: m.quantity || 1,
      from: warehouseMap.get(m.from_warehouse_id) || m.from_location || 'N/A',
      to: warehouseMap.get(m.to_warehouse_id) || m.to_location || 'N/A',
    }));

    // Stock trend (inbound/outbound)
    const trendDays = 30;
    const stockTrend: { date: string; inbound: number; outbound: number }[] = [];
    const now = new Date();
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const inbound = allMovements.filter(m => 
        m.created_at?.startsWith(dateStr) && 
        ['inbound', 'receipt', 'received'].includes(m.movement_type?.toLowerCase() || '')
      ).length;
      
      const outbound = allMovements.filter(m => 
        m.created_at?.startsWith(dateStr) && 
        ['outbound', 'issue', 'issued', 'transfer'].includes(m.movement_type?.toLowerCase() || '')
      ).length;
      
      stockTrend.push({ date: dateStr, inbound, outbound });
    }

    return {
      totalStock,
      inTransit,
      received,
      pending,
      stockByWarehouse: Object.entries(warehouseCounts).map(([warehouse, count]) => ({ warehouse, count })).sort((a, b) => b.count - a.count),
      recentMovements,
      stockTrend,
    };
  } catch (error) {
    console.error('Error fetching stock metrics:', error);
    throw error;
  }
}

// Export report data to CSV format
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        // Handle values with commas or quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Generate summary report
export async function generateSummaryReport(dateRange?: DateRange) {
  const [callMetrics, engineerMetrics, deviceMetrics, stockMetrics] = await Promise.all([
    getCallMetrics(dateRange),
    getEngineerMetrics(dateRange),
    getDeviceMetrics(dateRange),
    getStockMetrics(dateRange),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    dateRange,
    summary: {
      calls: {
        total: callMetrics.totalCalls,
        completed: callMetrics.completedCalls,
        completionRate: `${callMetrics.completionRate.toFixed(1)}%`,
        avgResolutionTime: `${callMetrics.avgResolutionTime} hours`,
      },
      engineers: {
        total: engineerMetrics.totalEngineers,
        active: engineerMetrics.activeEngineers,
        topPerformer: engineerMetrics.topPerformers[0]?.name || 'N/A',
      },
      devices: {
        total: deviceMetrics.totalDevices,
        installed: deviceMetrics.installedDevices,
        faulty: deviceMetrics.faultyDevices,
      },
      stock: {
        inWarehouse: stockMetrics.totalStock,
        inTransit: stockMetrics.inTransit,
      },
    },
    callMetrics,
    engineerMetrics,
    deviceMetrics,
    stockMetrics,
  };
}
