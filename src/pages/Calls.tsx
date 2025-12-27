import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, ClipboardList, Calendar, MapPin, Upload, X, Download } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { CreateCallModal } from '../components/CreateCallModal';
import { CSVUpload } from '../components/CSVUpload';
import { AssignCallModal } from '../components/AssignCallModal';
import { CancelCallModal } from '../components/CancelCallModal';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { SLAIndicator, AgeingIndicator } from '../components/SLAIndicator';
import { ProblemCodeBadge } from '../components/ProblemCodeSelect';

type Call = Database['public']['Tables']['calls']['Row'] & {
  bank?: Database['public']['Tables']['banks']['Row'];
  engineer?: Database['public']['Tables']['user_profiles']['Row'];
};

// Feature flag for SLA tracking
const ENABLE_SLA_TRACKING = import.meta.env.VITE_ENABLE_SLA_TRACKING !== 'false';

export function Calls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [callToCancel, setCallToCancel] = useState<{ id: string; number: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCalls();

    const channel = supabase
      .channel('calls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, loadCalls)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          bank:client_bank(id, name, code),
          engineer:assigned_engineer(id, full_name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setCalls(data as Call[]);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date for POA filter
  const today = new Date().toISOString().split('T')[0];

  // Filter calls based on active tab
  const getFilteredByTab = (callsList: Call[]) => {
    switch (activeTab) {
      case 'pending':
        return callsList.filter(c => c.status === 'pending');
      case 'assigned':
        return callsList.filter(c => c.status === 'assigned');
      case 'in_progress':
        return callsList.filter(c => c.status === 'in_progress');
      case 'todays_poa':
        return callsList.filter(c => 
          c.status === 'in_progress' && 
          (c.todays_poa_date === today || c.scheduled_date === today)
        );
      case 'completed':
        return callsList.filter(c => c.status === 'completed');
      case 'cancelled':
        return callsList.filter(c => c.status === 'cancelled');
      default:
        return callsList;
    }
  };

  const filteredCalls = getFilteredByTab(calls).filter((call) => {
    const matchesSearch =
      call.call_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.client_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.merchant_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (call.tid?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (call.mid?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (call.call_ticket?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Tab counts
  const tabCounts = {
    all: calls.length,
    pending: calls.filter(c => c.status === 'pending').length,
    assigned: calls.filter(c => c.status === 'assigned').length,
    in_progress: calls.filter(c => c.status === 'in_progress').length,
    todays_poa: calls.filter(c => 
      c.status === 'in_progress' && 
      (c.todays_poa_date === today || c.scheduled_date === today)
    ).length,
    completed: calls.filter(c => c.status === 'completed').length,
    cancelled: calls.filter(c => c.status === 'cancelled').length,
  };

  const exportToCSV = () => {
    const headers = [
      'Call Number', 'Customer', 'Region', 'Call Type', 'Status', 'Priority',
      'Request Date', 'TID', 'MID', 'Call Ticket', 'Device Model', 'Serial Number', 'SIM Number',
      'Merchant Name', 'Location', 'City', 'State', 'Address', 'Pincode',
      'Contact Person', 'Contact Number', 'Alternate Number', 'Latitude', 'Longitude',
      'Problem Description', 'Assigned Engineer', 'Scheduled Date', 'Created At'
    ];
    
    const rows = filteredCalls.map(call => [
      call.call_number,
      call.customer_name || call.bank?.name || '',
      call.region || '',
      call.type,
      call.status,
      call.priority,
      call.request_date || '',
      call.tid || '',
      call.mid || '',
      call.call_ticket || '',
      call.existing_device_model || '',
      call.serial_number || '',
      call.sim_number || '',
      call.merchant_name || call.client_name,
      call.location || '',
      call.city || '',
      call.state || '',
      call.client_address,
      call.pincode || '',
      call.contact_person_name || call.client_contact || '',
      call.contact_number || call.client_phone || '',
      call.alternate_number || '',
      call.latitude || '',
      call.longitude || '',
      call.description || '',
      call.engineer?.full_name || '',
      call.scheduled_date || '',
      new Date(call.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calls_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    breakdown: 'bg-red-50 text-red-700',
  };

  const priorityColors: Record<string, string> = {
    low: 'text-gray-600',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };

  const tabs = [
    { id: 'all', label: 'All Calls', count: tabCounts.all },
    { id: 'pending', label: 'Pending', count: tabCounts.pending },
    { id: 'assigned', label: 'Assigned', count: tabCounts.assigned },
    { id: 'todays_poa', label: "Today's POA", count: tabCounts.todays_poa },
    { id: 'in_progress', label: 'In Progress', count: tabCounts.in_progress },
    { id: 'completed', label: 'Completed', count: tabCounts.completed },
    { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled },
  ];

  const handleAssignClick = (call: Call) => {
    setSelectedCall(call);
    setShowAssignModal(true);
  };

  const handleCancelCall = (call: Call) => {
    setCallToCancel({ id: call.id, number: call.call_number });
    setShowCancelModal(true);
  };

  const handleUpdateStatus = async (callId: string, newStatus: 'completed' | 'cancelled') => {
    // For cancellation, use the modal instead
    if (newStatus === 'cancelled') {
      const call = calls.find(c => c.id === callId);
      if (call) {
        handleCancelCall(call);
      }
      return;
    }

    // For completion, show confirmation
    if (!window.confirm(`Are you sure you want to mark this call as ${newStatus}?`)) {
      return;
    }

    setActionLoading(callId);
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (error) throw error;
      loadCalls();
    } catch (error) {
      console.error('Error updating call status:', error);
      alert('Failed to update call status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-responsive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-1-responsive text-gray-900">Calls</h1>
          <p className="text-gray-600 mt-2">Manage field service calls and assignments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Call
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="card-responsive mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by call number, client, TID, MID, ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCalls.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No calls found</p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div
              key={call.id}
              className="card-responsive hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <ClipboardList className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{call.call_number}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeColors[call.type]}`}>
                          {call.type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[call.status]}`}>
                          {call.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-semibold uppercase ${priorityColors[call.priority]}`}>
                          {call.priority}
                        </span>
                        {call.problem_code && <ProblemCodeBadge code={call.problem_code} />}
                      </div>
                      <h3 className="heading-3-responsive text-gray-900 mb-1">
                        {call.merchant_name || call.client_name}
                      </h3>
                      <div className="text-sm text-gray-600 mb-1">
                        {call.customer_name && <span className="font-medium">{call.customer_name} • </span>}
                        {call.region && <span>{call.region}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{call.city ? `${call.city}, ${call.state}` : call.client_address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        {call.tid && <span>TID: {call.tid}</span>}
                        {call.mid && <span>MID: {call.mid}</span>}
                        {call.call_ticket && <span>Ticket: {call.call_ticket}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Calendar className="w-4 h-4" />
                        <span>Scheduled: {call.scheduled_date ? new Date(call.scheduled_date).toLocaleDateString() : 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                  {call.description && (
                    <p className="text-sm text-gray-600 mt-2 pl-8 line-clamp-2">{call.description}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  {ENABLE_SLA_TRACKING && (call.sla_hours || call.sla_due_date) && (
                    <div className="text-sm">
                      <SLAIndicator call={call} showAgeing />
                    </div>
                  )}
                  {ENABLE_SLA_TRACKING && !call.sla_hours && !call.sla_due_date && (
                    <div className="text-sm">
                      <AgeingIndicator call={call} />
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="text-gray-600">Bank</p>
                    <p className="font-medium text-gray-900">{call.bank?.name || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Assigned Engineer</p>
                    <p className="font-medium text-gray-900">{call.engineer?.full_name || 'Unassigned'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Assign Engineer button - show for pending/assigned calls */}
                    {(call.status === 'pending' || call.status === 'assigned') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssignClick(call); }}
                        className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition flex items-center gap-1"
                        title="Assign Engineer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign
                      </button>
                    )}
                    {/* Complete button - show for assigned/in_progress calls */}
                    {(call.status === 'assigned' || call.status === 'in_progress') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(call.id, 'completed'); }}
                        disabled={actionLoading === call.id}
                        className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition flex items-center gap-1 disabled:opacity-50"
                        title="Mark as Completed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                    {/* Cancel button - show for pending/assigned/in_progress calls */}
                    {(call.status === 'pending' || call.status === 'assigned' || call.status === 'in_progress') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(call.id, 'cancelled'); }}
                        disabled={actionLoading === call.id}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                        title="Cancel Call"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/calls/${call.id}`)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredCalls.length} of {calls.length} calls
        </p>
      </div>

      <CreateCallModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadCalls();
        }}
      />

      <CSVUpload
        isOpen={showCSVUpload}
        onClose={() => setShowCSVUpload(false)}
        entity="calls"
        onSuccess={() => {
          setShowCSVUpload(false);
          loadCalls();
        }}
      />

      {selectedCall && (
        <AssignCallModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCall(null);
          }}
          call={selectedCall}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedCall(null);
            loadCalls();
          }}
        />
      )}

      {callToCancel && (
        <CancelCallModal
          callId={callToCancel.id}
          callNumber={callToCancel.number}
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCallToCancel(null);
          }}
          onSuccess={() => {
            setShowCancelModal(false);
            setCallToCancel(null);
            loadCalls();
          }}
        />
      )}
    </div>
  );
}