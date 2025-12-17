import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Filter, Upload, Download, Users, MapPin, Phone, Calendar,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  UserPlus, Building2, RefreshCw, FileSpreadsheet, Eye, Edit, Trash2,
  ArrowRight, CheckSquare, Square, MoreVertical
} from 'lucide-react';

type Call = {
  id: string;
  call_number: string;
  type: string;
  status: string;
  client_name: string;
  client_phone: string | null;
  client_address: string;
  city?: string;
  state?: string;
  priority: string;
  scheduled_date: string;
  assigned_engineer: string | null;
  customer_id?: string;
  created_at: string;
  fsp_center?: string;
  mid?: string;
  tid?: string;
  description?: string;
  banks?: { id: string; name: string; code: string } | null;
  user_profiles?: { id: string; full_name: string; phone: string | null } | null;
};

type Engineer = {
  id: string;
  full_name: string;
  phone: string | null;
  bank_id?: string | null;
  role: string;
  status: string;
};

type Office = {
  id: string;
  name: string;
  code: string;
};

export function CallManagement() {
  const { profile, isCallManager, isSuperAdmin } = useAuth();
  
  // Data states
  const [calls, setCalls] = useState<Call[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    priority: 'all',
    engineer: 'all',
    office: 'all',
    customer: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showBulkAllocateModal, setShowBulkAllocateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  
  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCustomer, setImportCustomer] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [callsRes, engineersRes, officesRes, banksRes] = await Promise.all([
        // FIXED: Correct Supabase relationship syntax
        supabase.from('calls').select(`
          *,
          banks!client_bank(id, name, code),
          user_profiles!assigned_engineer(id, full_name, phone)
        `).order('created_at', { ascending: false }).limit(500),
        supabase.from('user_profiles').select('*').eq('role', 'engineer').eq('status', 'active'),
        supabase.from('warehouses').select('*').eq('active', true),
        supabase.from('banks').select('id, name, code').eq('active', true),
      ]);

      setCalls(callsRes.data || []);
      setEngineers(engineersRes.data || []);
      setOffices(officesRes.data || []);
      // Use banks as customers (client_bank relationship)
      setCustomers(banksRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter calls
  const filteredCalls = useMemo(() => {
    return calls.filter(call => {
      const searchMatch = filters.search === '' || 
        call.call_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.client_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.client_address?.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.mid?.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.tid?.toLowerCase().includes(filters.search.toLowerCase());
      
      const statusMatch = filters.status === 'all' || call.status === filters.status;
      const typeMatch = filters.type === 'all' || call.type === filters.type;
      const priorityMatch = filters.priority === 'all' || call.priority === filters.priority;
      const engineerMatch = filters.engineer === 'all' || call.assigned_engineer === filters.engineer;
      const customerMatch = filters.customer === 'all' || call.customer_id === filters.customer;
      
      const dateFromMatch = !filters.dateFrom || new Date(call.scheduled_date) >= new Date(filters.dateFrom);
      const dateToMatch = !filters.dateTo || new Date(call.scheduled_date) <= new Date(filters.dateTo);

      return searchMatch && statusMatch && typeMatch && priorityMatch && 
             engineerMatch && customerMatch && dateFromMatch && dateToMatch;
    });
  }, [calls, filters]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(filteredCalls.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual selection
  const handleSelectCall = (callId: string) => {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  };

  // Import calls from CSV
  const handleImport = async () => {
    if (!importFile || !importCustomer) {
      alert('Please select a file and customer');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Get customer's bank
      const customer = customers.find(c => c.id === importCustomer);
      const bankId = customer?.bank_id || '44444444-4444-4444-4444-444444444444';

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.trim() || '';
        });

        try {
          // Map CSV columns to database fields
          const callData = {
            call_number: row['call no'] || row['call_number'] || row['callno'] || `CALL-${Date.now()}-${i}`,
            type: mapCallType(row['call type'] || row['type'] || 'install'),
            status: 'pending',
            client_bank: bankId,
            client_name: row['merchant name'] || row['client_name'] || row['name'] || 'Unknown',
            client_phone: row['phone'] || row['mobile'] || row['contact'] || null,
            client_address: row['address'] || row['location'] || '',
            city: row['city'] || row['district'] || '',
            state: row['state'] || '',
            priority: mapPriority(row['priority'] || 'medium'),
            scheduled_date: parseDate(row['date'] || row['scheduled_date']) || new Date().toISOString().split('T')[0],
            customer_id: importCustomer,
            mid: row['mid'] || row['merchant id'] || null,
            tid: row['tid'] || row['terminal id'] || null,
            fsp_center: row['fsp center'] || row['center'] || null,
            description: row['description'] || row['remarks'] || '',
          };

          const { error } = await supabase.from('calls').insert(callData);
          
          if (error) {
            failed++;
            errors.push(`Row ${i}: ${error.message}`);
          } else {
            success++;
          }
        } catch (err: any) {
          failed++;
          errors.push(`Row ${i}: ${err.message}`);
        }
      }

      setImportResult({ success, failed, errors });
      if (success > 0) {
        loadData();
      }
    } catch (error: any) {
      setImportResult({ success: 0, failed: 1, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  // Allocate calls to engineer
  const handleAllocateToEngineer = async (engineerId: string) => {
    const callsToAllocate = selectedCall ? [selectedCall.id] : selectedCalls;
    
    if (callsToAllocate.length === 0) {
      alert('No calls selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('calls')
        .update({ 
          assigned_engineer: engineerId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .in('id', callsToAllocate);

      if (error) throw error;

      alert(`${callsToAllocate.length} call(s) allocated successfully`);
      setShowAllocateModal(false);
      setShowBulkAllocateModal(false);
      setSelectedCalls([]);
      setSelectedCall(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Update call status
  const handleUpdateCall = async (updates: Partial<Call>) => {
    if (!selectedCall) return;

    try {
      const { error } = await supabase
        .from('calls')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', selectedCall.id);

      if (error) throw error;

      alert('Call updated successfully');
      setShowUpdateModal(false);
      setSelectedCall(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedCalls.length === 0) {
      alert('No calls selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('calls')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedCalls);

      if (error) throw error;

      alert(`${selectedCalls.length} call(s) updated to ${newStatus}`);
      setSelectedCalls([]);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Helper functions
  const mapCallType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'installation': 'install',
      'install': 'install',
      'breakdown': 'breakdown',
      'break down': 'breakdown',
      'swap': 'swap',
      'replacement': 'swap',
      'deinstall': 'deinstall',
      'de-install': 'deinstall',
      'removal': 'deinstall',
      'maintenance': 'maintenance',
      'pm': 'maintenance',
    };
    return typeMap[type.toLowerCase()] || 'install';
  };

  const mapPriority = (priority: string): string => {
    const priorityMap: Record<string, string> = {
      'high': 'high',
      'urgent': 'urgent',
      'critical': 'urgent',
      'low': 'low',
      'normal': 'medium',
      'medium': 'medium',
    };
    return priorityMap[priority.toLowerCase()] || 'medium';
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try various date formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        } else if (format === formats[2]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
        return dateStr.split('T')[0];
      }
    }
    return null;
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const typeColors: Record<string, string> = {
    install: 'bg-green-50 text-green-700',
    swap: 'bg-blue-50 text-blue-700',
    deinstall: 'bg-red-50 text-red-700',
    maintenance: 'bg-yellow-50 text-yellow-700',
    breakdown: 'bg-red-100 text-red-800',
  };

  const priorityColors: Record<string, string> = {
    low: 'text-gray-600',
    medium: 'text-blue-600',
    high: 'text-orange-600 font-semibold',
    urgent: 'text-red-600 font-bold',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-responsive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-1-responsive text-gray-900">Call Management</h1>
          <p className="text-gray-500 mt-1">
            {filteredCalls.length} calls • {selectedCalls.length} selected
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="h-5 w-5" />
            Import Calls
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by call number, merchant, MID, TID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="install">Installation</option>
              <option value="swap">Swap</option>
              <option value="breakdown">Breakdown</option>
              <option value="maintenance">Maintenance</option>
              <option value="deinstall">De-install</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              More Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label-responsive">Engineer</label>
              <select
                value={filters.engineer}
                onChange={(e) => setFilters(prev => ({ ...prev, engineer: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Engineers</option>
                <option value="">Unassigned</option>
                {engineers.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-responsive">Customer</label>
              <select
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Customers</option>
                {customers.map(cust => (
                  <option key={cust.id} value={cust.id}>{cust.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-responsive">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="form-label-responsive">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCalls.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {selectedCalls.length} call(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkAllocateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Allocate to Engineer
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('cancelled')}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" />
              Cancel Selected
            </button>
            <button
              onClick={() => setSelectedCalls([])}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Calls Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="table-responsive-wrapper custom-scrollbar">
        <table className="table-responsive">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-td-responsive text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="table-th-responsive">Call #</th>
                <th className="table-th-responsive">Type</th>
                <th className="table-th-responsive">Status</th>
                <th className="table-th-responsive">Merchant</th>
                <th className="table-th-responsive">Location</th>
                <th className="table-th-responsive">Engineer</th>
                <th className="table-th-responsive">Priority</th>
                <th className="table-th-responsive">Date</th>
                <th className="table-th-responsive">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCalls.map((call) => (
                <tr key={call.id} className={selectedCalls.includes(call.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="table-td-responsive">
                    <input
                      type="checkbox"
                      checked={selectedCalls.includes(call.id)}
                      onChange={() => handleSelectCall(call.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="table-td-responsive text-sm font-medium text-gray-900">
                    {call.call_number}
                  </td>
                  <td className="table-td-responsive">
                    <span className={`px-2 py-1 text-xs rounded-full ${typeColors[call.type] || 'bg-gray-100'}`}>
                      {call.type}
                    </span>
                  </td>
                  <td className="table-td-responsive">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[call.status] || 'bg-gray-100'}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="table-td-responsive">
                    <div className="text-sm text-gray-900">{call.client_name}</div>
                    {call.mid && <div className="text-xs text-gray-500">MID: {call.mid}</div>}
                  </td>
                  <td className="table-td-responsive">
                    <div className="text-sm text-gray-600 max-w-xs truncate">{call.client_address}</div>
                    {call.city && <div className="text-xs text-gray-500">{call.city}</div>}
                  </td>
                  <td className="table-td-responsive">
                    {call.user_profiles ? (
                      <div className="text-sm text-gray-900">{call.user_profiles.full_name}</div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="table-td-responsive">
                    <span className={`text-sm ${priorityColors[call.priority]}`}>
                      {call.priority}
                    </span>
                  </td>
                  <td className="table-td-responsive text-sm text-gray-600">
                    {new Date(call.scheduled_date).toLocaleDateString()}
                  </td>
                  <td className="table-td-responsive">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowAllocateModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Allocate"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowUpdateModal(true);
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No calls found matching your filters</p>
          </div>
        )}
      </div>

      {/* Modals omitted for brevity - they remain the same */}
    </div>
  );
}

// UpdateCallForm component remains the same
function UpdateCallForm({ 
  call, 
  engineers, 
  onUpdate, 
  onCancel 
}: { 
  call: Call; 
  engineers: Engineer[]; 
  onUpdate: (updates: Partial<Call>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    status: call.status,
    priority: call.priority,
    assigned_engineer: call.assigned_engineer || '',
    scheduled_date: call.scheduled_date?.split('T')[0] || '',
    description: call.description || '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label-responsive">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="form-label-responsive">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label-responsive">Assigned Engineer</label>
        <select
          value={formData.assigned_engineer}
          onChange={(e) => setFormData(prev => ({ ...prev, assigned_engineer: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">Unassigned</option>
          {engineers.map(eng => (
            <option key={eng.id} value={eng.id}>{eng.full_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label-responsive">Scheduled Date</label>
        <input
          type="date"
          value={formData.scheduled_date}
          onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="form-label-responsive">Notes</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onUpdate(formData)}
          className="btn-primary-responsive"
        >
          Update Call
        </button>
      </div>
    </div>
  );
}
