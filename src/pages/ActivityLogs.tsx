import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Activity, Search, Filter, Download, RefreshCw, 
  Package, User, Truck, ClipboardList, Settings,
  ArrowRightLeft, Building2, Calendar, Clock
} from 'lucide-react';

type ActivityLog = {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  office_id: string;
  office_name: string;
  description: string;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
};

type Office = {
  id: string;
  name: string;
  code: string;
};

const activityIcons: Record<string, React.ReactNode> = {
  'stock_transfer': <ArrowRightLeft className="w-4 h-4" />,
  'device_update': <Package className="w-4 h-4" />,
  'call_created': <ClipboardList className="w-4 h-4" />,
  'call_updated': <ClipboardList className="w-4 h-4" />,
  'call_completed': <ClipboardList className="w-4 h-4" />,
  'engineer_assigned': <User className="w-4 h-4" />,
  'engineer_transfer': <User className="w-4 h-4" />,
  'courier_dispatch': <Truck className="w-4 h-4" />,
  'login': <Settings className="w-4 h-4" />,
  'default': <Activity className="w-4 h-4" />,
};

const activityColors: Record<string, string> = {
  'stock_transfer': 'bg-blue-100 text-blue-600',
  'device_update': 'bg-purple-100 text-purple-600',
  'call_created': 'bg-green-100 text-green-600',
  'call_updated': 'bg-yellow-100 text-yellow-600',
  'call_completed': 'bg-emerald-100 text-emerald-600',
  'engineer_assigned': 'bg-indigo-100 text-indigo-600',
  'engineer_transfer': 'bg-orange-100 text-orange-600',
  'courier_dispatch': 'bg-amber-100 text-amber-600',
  'login': 'bg-gray-100 text-gray-600',
  'default': 'bg-gray-100 text-gray-600',
};

export function ActivityLogs() {
  const { user, profile, isAdmin, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [assignedOffices, setAssignedOffices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOffice, setFilterOffice] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadAssignedOffices();
  }, [user]);

  useEffect(() => {
    if (assignedOffices.length > 0 || isSuperAdmin) {
      loadLogs();
    }
  }, [assignedOffices, filterType, filterOffice, dateFrom, dateTo]);

  const loadAssignedOffices = async () => {
    if (!user) return;

    try {
      // Get all offices
      const { data: allOffices } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      setOffices(allOffices || []);

      if (isSuperAdmin) {
        // Super admin sees all offices
        setAssignedOffices((allOffices || []).map(o => o.id));
      } else {
        // Get admin's assigned offices
        const { data: assignments } = await supabase
          .from('admin_office_assignments')
          .select('office_id')
          .eq('admin_id', user.id);

        setAssignedOffices((assignments || []).map(a => a.office_id));
      }
    } catch (error) {
      console.error('Error loading offices:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // Filter by assigned offices (unless super admin viewing all)
      if (!isSuperAdmin || filterOffice !== 'all') {
        if (filterOffice !== 'all') {
          query = query.eq('office_id', filterOffice);
        } else {
          query = query.in('office_id', assignedOffices);
        }
      }

      // Filter by activity type
      if (filterType !== 'all') {
        query = query.eq('activity_type', filterType);
      }

      // Filter by date range
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.description.toLowerCase().includes(search) ||
      (log.actor_name || '').toLowerCase().includes(search) ||
      (log.office_name || '').toLowerCase().includes(search) ||
      log.activity_type.toLowerCase().includes(search)
    );
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Activity', 'Description', 'Actor', 'Office'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleDateString(),
      new Date(log.created_at).toLocaleTimeString(),
      log.activity_type,
      log.description,
      log.actor_name || '-',
      log.office_name || '-'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} min ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'stock_transfer', label: 'Stock Transfers' },
    { value: 'device_update', label: 'Device Updates' },
    { value: 'call_created', label: 'Calls Created' },
    { value: 'call_updated', label: 'Calls Updated' },
    { value: 'call_completed', label: 'Calls Completed' },
    { value: 'engineer_assigned', label: 'Engineer Assigned' },
    { value: 'engineer_transfer', label: 'Engineer Transfers' },
    { value: 'courier_dispatch', label: 'Courier Dispatch' },
  ];

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">
            Universal activity log for your assigned offices
            {!isSuperAdmin && assignedOffices.length > 0 && (
              <span className="ml-2 text-sm text-blue-600">
                ({assignedOffices.length} office{assignedOffices.length > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Assigned Offices Info */}
      {isAdmin && !isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Your Assigned Offices:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {offices
              .filter(o => assignedOffices.includes(o.id))
              .map(office => (
                <span key={office.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {office.name} ({office.code})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Activity Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {activityTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          {/* Office Filter */}
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Offices</option>
            {offices
              .filter(o => isSuperAdmin || assignedOffices.includes(o.id))
              .map(office => (
                <option key={office.id} value={office.id}>{office.name}</option>
              ))}
          </select>

          {/* Date Filter */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="From"
            />
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
              <p className="text-xs text-gray-500">Total Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredLogs.filter(l => l.activity_type === 'stock_transfer').length}
              </p>
              <p className="text-xs text-gray-500">Stock Transfers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredLogs.filter(l => l.activity_type.startsWith('call_')).length}
              </p>
              <p className="text-xs text-gray-500">Call Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredLogs.filter(l => l.activity_type.startsWith('engineer_')).length}
              </p>
              <p className="text-xs text-gray-500">Engineer Activities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Activity Timeline</h2>
        </div>
        
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No activities found</p>
            <p className="text-sm text-gray-400 mt-1">Activities will appear here as they happen</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${activityColors[log.activity_type] || activityColors.default}`}>
                    {activityIcons[log.activity_type] || activityIcons.default}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium">{log.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                      {log.actor_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.actor_name}
                          {log.actor_role && (
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {log.actor_role}
                            </span>
                          )}
                        </span>
                      )}
                      {log.office_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {log.office_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Activity Type Badge */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${activityColors[log.activity_type] || activityColors.default}`}>
                    {log.activity_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
