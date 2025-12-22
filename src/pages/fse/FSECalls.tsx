import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, MapPin, Clock, Calendar, ChevronRight, ArrowLeft,
  ClipboardList, Play, CheckCircle, AlertCircle, Camera, Package,
  DollarSign, RotateCcw, RefreshCw, User, Building2, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, isToday, parseISO } from 'date-fns';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  sub_status?: string;
  priority: string;
  client_name: string;
  client_address: string;
  client_phone?: string;
  city?: string;
  scheduled_date: string;
  mid?: string;
  tid?: string;
  problem_code?: string;
  description?: string;
  ageing?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  completed_at?: string;
  resolution_notes?: string;
}

type TabType = 'assigned' | 'poa' | 'completed';

export default function FSECalls() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('poa');
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load calls based on active tab
  const loadCalls = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase
        .from('calls')
        .select('*')
        .eq('assigned_engineer', user.id)
        .order('scheduled_date', { ascending: true });

      // Filter based on tab
      if (activeTab === 'assigned') {
        // Assigned but not started - pending calls not scheduled for today
        query = query
          .in('status', ['pending', 'assigned'])
          .neq('scheduled_date', format(new Date(), 'yyyy-MM-dd'));
      } else if (activeTab === 'poa') {
        // Today's Plan of Action - calls scheduled for today or in progress
        query = query
          .or(`scheduled_date.eq.${format(new Date(), 'yyyy-MM-dd')},status.eq.in_progress`);
      } else {
        // Completed calls
        query = query
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCalls(data || []);
    } catch (err) {
      console.error('Error loading calls:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [activeTab, user?.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'assigned': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'install': return '🔧';
      case 'swap': return '🔄';
      case 'deinstall': return '📦';
      case 'maintenance': return '🛠️';
      case 'breakdown': return '⚠️';
      default: return '📋';
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'assigned', label: 'Assigned', icon: <ClipboardList size={18} /> },
    { id: 'poa', label: "Today's POA", icon: <Play size={18} /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={18} /> },
  ];

  const handleCallClick = (call: Call) => {
    if (activeTab === 'poa') {
      // Navigate to action page for POA calls
      navigate(`/fse/calls/${call.id}/action`);
    } else {
      // Navigate to read-only detail view for assigned/completed
      navigate(`/fse/calls/${call.id}`);
    }
  };

  const CallCard = ({ call, isEditable = false }: { call: Call; isEditable?: boolean }) => (
    <div
      onClick={() => handleCallClick(call)}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 active:scale-[0.98] transition-transform cursor-pointer ${
        isEditable ? 'border-l-4 border-l-blue-500' : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getCallTypeIcon(call.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">#{call.call_number}</h3>
            <span className="text-xs text-gray-500 capitalize">{call.type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(call.priority)}`}>
            {call.priority}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
            {call.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <Building2 size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-700 font-medium">{call.client_name}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600 line-clamp-2">{call.client_address}</span>
        </div>
        {call.client_phone && (
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-gray-400 flex-shrink-0" />
            <a 
              href={`tel:${call.client_phone}`} 
              className="text-sm text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {call.client_phone}
            </a>
          </div>
        )}
      </div>

      {/* MID/TID Row */}
      {(call.mid || call.tid) && (
        <div className="flex gap-4 mb-3 text-xs">
          {call.mid && (
            <div className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-gray-500">MID:</span>{' '}
              <span className="font-mono text-gray-700">{call.mid}</span>
            </div>
          )}
          {call.tid && (
            <div className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-gray-500">TID:</span>{' '}
              <span className="font-mono text-gray-700">{call.tid}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{format(parseISO(call.scheduled_date), 'dd MMM')}</span>
          </div>
          {call.ageing && call.ageing > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock size={14} />
              <span>{call.ageing}d old</span>
            </div>
          )}
          {call.city && (
            <span className="text-gray-400">{call.city}</span>
          )}
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </div>

      {/* Problem Code */}
      {call.problem_code && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Problem: </span>
          <span className="text-xs font-medium text-gray-700">{call.problem_code}</span>
        </div>
      )}

      {/* Resolution Notes for Completed */}
      {call.status === 'completed' && call.resolution_notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Resolution: </span>
          <span className="text-xs text-gray-700">{call.resolution_notes}</span>
        </div>
      )}

      {/* Editable indicator */}
      {isEditable && (
        <div className="mt-3 flex items-center justify-center gap-2 bg-blue-50 rounded-lg py-2">
          <span className="text-xs font-medium text-blue-700">Tap to update status</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">My Calls</h1>
              <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
            </div>
          </div>
          <button
            onClick={() => loadCalls(true)}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin text-blue-600' : 'text-gray-600'} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tab Description */}
        <div className="mb-4">
          {activeTab === 'assigned' && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex items-start gap-3">
              <ClipboardList size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">Assigned Calls</p>
                <p className="text-xs text-purple-600">Read-only view of your pending calls not scheduled for today</p>
              </div>
            </div>
          )}
          {activeTab === 'poa' && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
              <Play size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Today's Plan of Action</p>
                <p className="text-xs text-blue-600">Tap any call to update status, add inventory, photos & expenses</p>
              </div>
            </div>
          )}
          {activeTab === 'completed' && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Completed Calls</p>
                <p className="text-xs text-green-600">Archive of your completed work</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Loading calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {activeTab === 'poa' ? (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No calls for today</h3>
                <p className="text-sm text-gray-500">You have no calls scheduled for today</p>
              </>
            ) : activeTab === 'assigned' ? (
              <>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList size={32} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No pending calls</h3>
                <p className="text-sm text-gray-500">All caught up! No pending assignments</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No completed calls</h3>
                <p className="text-sm text-gray-500">Your completed calls will appear here</p>
              </>
            )}
          </div>
        ) : (
          <div>
            {/* Call Count */}
            <p className="text-sm text-gray-500 mb-3">
              {calls.length} call{calls.length !== 1 ? 's' : ''} 
              {activeTab === 'poa' ? ' for today' : activeTab === 'assigned' ? ' pending' : ' completed'}
            </p>

            {/* Call Cards */}
            {calls.map((call) => (
              <CallCard 
                key={call.id} 
                call={call} 
                isEditable={activeTab === 'poa'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
