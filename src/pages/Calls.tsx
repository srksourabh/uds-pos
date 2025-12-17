import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, ClipboardList, Calendar, MapPin, Upload, X } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { CreateCallModal } from '../components/CreateCallModal';
import { CSVUpload } from '../components/CSVUpload';

type Call = Database['public']['Tables']['calls']['Row'] & {
  bank?: Database['public']['Tables']['banks']['Row'];
  engineer?: Database['public']['Tables']['user_profiles']['Row'];
};

export function Calls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

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

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      call.call_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.client_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            onClick={() => setShowCSVUpload(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
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

      <div className="card-responsive mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by call number, client name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
                      <div className="flex items-center gap-2 mb-2">
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
                      </div>
                      <h3 className="heading-3-responsive text-gray-900 mb-1">{call.client_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{call.client_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Scheduled: {new Date(call.scheduled_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {call.description && (
                    <p className="text-sm text-gray-600 mt-2 pl-8">{call.description}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="text-sm">
                    <p className="text-gray-600">Bank</p>
                    <p className="font-medium text-gray-900">{call.bank?.name || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Assigned Engineer</p>
                    <p className="font-medium text-gray-900">{call.engineer?.full_name || 'Unassigned'}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/calls/${call.id}`)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    View Details
                  </button>
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
          loadCalls();
          setShowCreateModal(false);
        }}
      />

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Import Calls from CSV</h2>
              <button
                onClick={() => setShowCSVUpload(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <CSVUpload
                onComplete={(results) => {
                  const successCount = results.filter(r => r.success).length;
                  if (successCount > 0) {
                    loadCalls();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
