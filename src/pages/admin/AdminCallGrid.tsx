import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, Search, Filter, Download, RefreshCw, ChevronDown, ChevronUp,
  Clock, AlertTriangle, MapPin, User, Calendar, ArrowUpDown, X,
  Building2, Cpu, CheckCircle, AlertCircle, Hourglass
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  priority: string;
  client_name: string;
  client_address: string;
  client_phone: string | null;
  city: string | null;
  statecode: string | null;
  mid: string | null;
  tid: string | null;
  scheduled_date: string;
  created_at: string;
  ageing: number | null;
  sla_breached: boolean;
  sla_deadline: string | null;
  fsp_region: string | null;
  fsp_center: string | null;
  problem_code: string | null;
  assigned_engineer: string | null;
  latitude: number | null;
  longitude: number | null;
  customer_id: string | null;
  // Enriched fields
  engineer_name?: string;
  bank_name?: string;
  customer_name?: string;
}

interface FilterState {
  status: string;
  priority: string;
  region: string;
  slaBreached: string;
  dateFrom: string;
  dateTo: string;
}

export function AdminCallGrid() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof Call>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    priority: '',
    region: '',
    slaBreached: '',
    dateFrom: '',
    dateTo: ''
  });

  // Lookup maps
  const [engineerMap, setEngineerMap] = useState<Map<string, string>>(new Map());
  const [bankMap, setBankMap] = useState<Map<string, string>>(new Map());
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map());
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    loadLookups();
    loadCalls();
  }, []);

  const loadLookups = async () => {
    // Load engineers
    const { data: engineers } = await supabase
      .from('user_profiles')
      .select('id, full_name, emp_id')
      .eq('role', 'engineer');
    if (engineers) {
      const map = new Map<string, string>();
      engineers.forEach(e => map.set(e.id, e.full_name || e.emp_id || 'Unknown'));
      setEngineerMap(map);
    }

    // Load banks
    const { data: banks } = await supabase.from('banks').select('id, name');
    if (banks) {
      const map = new Map<string, string>();
      banks.forEach(b => map.set(b.id, b.name));
      setBankMap(map);
    }

    // Load customers
    const { data: customers } = await supabase.from('customers').select('id, name, short_name');
    if (customers) {
      const map = new Map<string, string>();
      customers.forEach(c => map.set(c.id, c.short_name || c.name));
      setCustomerMap(map);
    }
  };

  const loadCalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Enrich with lookup data
      const enrichedCalls = (data || []).map(call => ({
        ...call,
        engineer_name: call.assigned_engineer ? engineerMap.get(call.assigned_engineer) : undefined,
        bank_name: call.client_bank ? bankMap.get(call.client_bank) : undefined,
        customer_name: call.customer_id ? customerMap.get(call.customer_id) : undefined
      }));

      setCalls(enrichedCalls);

      // Extract unique regions
      const uniqueRegions = [...new Set(data?.map(c => c.fsp_region).filter(Boolean) || [])];
      setRegions(uniqueRegions as string[]);
    } catch (error) {
      console.error('Error loading calls:', error);
    }
    setLoading(false);
  };

  // Re-enrich when maps change
  useEffect(() => {
    if (calls.length > 0 && (engineerMap.size > 0 || bankMap.size > 0 || customerMap.size > 0)) {
      setCalls(prev => prev.map(call => ({
        ...call,
        engineer_name: call.assigned_engineer ? engineerMap.get(call.assigned_engineer) : undefined,
        bank_name: call.client_bank ? bankMap.get(call.client_bank as string) : undefined,
        customer_name: call.customer_id ? customerMap.get(call.customer_id) : undefined
      })));
    }
  }, [engineerMap, bankMap, customerMap]);

  // Calculate ageing for each call
  const calculateAgeing = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    let result = [...calls];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.call_number?.toLowerCase().includes(term) ||
        c.client_name?.toLowerCase().includes(term) ||
        c.mid?.toLowerCase().includes(term) ||
        c.tid?.toLowerCase().includes(term) ||
        c.city?.toLowerCase().includes(term) ||
        c.engineer_name?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status) {
      result = result.filter(c => c.status === filters.status);
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter(c => c.priority === filters.priority);
    }

    // Region filter
    if (filters.region) {
      result = result.filter(c => c.fsp_region === filters.region);
    }

    // SLA breached filter
    if (filters.slaBreached) {
      const breached = filters.slaBreached === 'true';
      result = result.filter(c => c.sla_breached === breached);
    }

    // Date range filter
    if (filters.dateFrom) {
      result = result.filter(c => new Date(c.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      result = result.filter(c => new Date(c.created_at) <= new Date(filters.dateTo + 'T23:59:59'));
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [calls, searchTerm, filters, sortField, sortDirection]);

  const handleSort = (field: keyof Call) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToCsv = () => {
    const headers = ['Call#', 'Type', 'Status', 'Priority', 'Client', 'City', 'Region', 'MID', 'TID', 'Engineer', 'Scheduled', 'Created', 'Ageing', 'SLA Breached'];
    const rows = filteredCalls.map(c => [
      c.call_number,
      c.type,
      c.status,
      c.priority,
      c.client_name,
      c.city || '',
      c.fsp_region || '',
      c.mid || '',
      c.tid || '',
      c.engineer_name || '',
      c.scheduled_date || '',
      c.created_at?.split('T')[0] || '',
      calculateAgeing(c.created_at),
      c.sla_breached ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calls_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      region: '',
      slaBreached: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchTerm('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgeingColor = (days: number) => {
    if (days >= 7) return 'text-red-600 font-bold';
    if (days >= 3) return 'text-orange-600 font-medium';
    if (days >= 1) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Stats
  const stats = useMemo(() => {
    const total = filteredCalls.length;
    const pending = filteredCalls.filter(c => c.status === 'pending').length;
    const inProgress = filteredCalls.filter(c => c.status === 'in_progress').length;
    const completed = filteredCalls.filter(c => c.status === 'completed').length;
    const breached = filteredCalls.filter(c => c.sla_breached).length;
    return { total, pending, inProgress, completed, breached };
  }, [filteredCalls]);

  const SortHeader = ({ field, label }: { field: keyof Call; label: string }) => (
    <th 
      className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Phone className="w-6 h-6 text-blue-600" />
              Call Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Global view of all service calls</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCalls}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportToCsv}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Calls</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
            <div className="text-xs text-blue-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{stats.breached}</div>
            <div className="text-xs text-red-600">SLA Breached</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 sm:px-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by call#, client, MID, TID, city, engineer..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(filters).some(v => v) && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>

            {/* Clear Filters */}
            {(Object.values(filters).some(v => v) || searchTerm) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={e => setFilters({...filters, priority: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                <select
                  value={filters.region}
                  onChange={e => setFilters({...filters, region: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Regions</option>
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SLA</label>
                <select
                  value={filters.slaBreached}
                  onChange={e => setFilters({...filters, slaBreached: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All</option>
                  <option value="true">Breached</option>
                  <option value="false">Within SLA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="px-4 sm:px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <SortHeader field="priority" label="Pri" />
                  <SortHeader field="call_number" label="Call#" />
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Coordinator</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Customer</th>
                  <SortHeader field="fsp_region" label="Region" />
                  <th className="px-3 py-3 text-left font-medium text-gray-600">SLA</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Age</th>
                  <SortHeader field="tid" label="TID" />
                  <SortHeader field="mid" label="MID" />
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Device</th>
                  <SortHeader field="city" label="Location" />
                  <SortHeader field="problem_code" label="Problem" />
                  <SortHeader field="status" label="Status" />
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Engineer</th>
                  <SortHeader field="scheduled_date" label="Scheduled" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading calls...
                    </td>
                  </tr>
                ) : filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-gray-500">
                      No calls found
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map(call => {
                    const ageing = calculateAgeing(call.created_at);
                    return (
                      <tr key={call.id} className="hover:bg-gray-50">
                        {/* Priority */}
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(call.priority)}`}>
                            {call.priority?.[0]?.toUpperCase() || '-'}
                          </span>
                        </td>

                        {/* Call Number */}
                        <td className="px-3 py-2 font-mono font-medium text-blue-600">
                          {call.call_number}
                        </td>

                        {/* Coordinator (placeholder) */}
                        <td className="px-3 py-2 text-gray-600">
                          {call.created_by || '-'}
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-2">
                          <span className="font-medium">{call.customer_name || '-'}</span>
                        </td>

                        {/* Region */}
                        <td className="px-3 py-2 text-gray-600">
                          {call.fsp_region || '-'}
                        </td>

                        {/* SLA */}
                        <td className="px-3 py-2">
                          {call.sla_breached ? (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              Breach
                            </span>
                          ) : call.sla_deadline ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Ageing */}
                        <td className={`px-3 py-2 ${getAgeingColor(ageing)}`}>
                          {ageing}d
                        </td>

                        {/* TID */}
                        <td className="px-3 py-2 font-mono text-gray-600">
                          {call.tid || '-'}
                        </td>

                        {/* MID */}
                        <td className="px-3 py-2 font-mono text-gray-600">
                          {call.mid || '-'}
                        </td>

                        {/* Device */}
                        <td className="px-3 py-2 text-gray-600">
                          {call.type || '-'}
                        </td>

                        {/* Location */}
                        <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate" title={call.client_address}>
                          {call.city || '-'}
                          {call.statecode && `, ${call.statecode}`}
                        </td>

                        {/* Problem Code */}
                        <td className="px-3 py-2 text-gray-600">
                          {call.problem_code || '-'}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </td>

                        {/* Engineer */}
                        <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">
                          {call.engineer_name || '-'}
                        </td>

                        {/* Scheduled Date */}
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {call.scheduled_date || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            Showing {filteredCalls.length} of {calls.length} calls
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCallGrid;
