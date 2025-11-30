import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { OfflineQueueStatus } from '../../components/OfflineQueueStatus';
import {
  MapPin,
  Clock,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  Package
} from 'lucide-react';

interface Call {
  id: string;
  call_number: string;
  type: string;
  status: string;
  client_bank: string;
  client_name: string;
  client_address: string;
  scheduled_date: string;
  priority: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
}

type FilterType = 'all' | 'assigned' | 'in_progress' | 'overdue' | 'today';

export default function MobileCalls() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchCalls = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('assigned_engineer', user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('priority', { ascending: false })
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setCalls(data || []);
      setLastSync(new Date());

      if (isOnline) {
        localStorage.setItem('cached_calls', JSON.stringify(data || []));
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
      const cached = localStorage.getItem('cached_calls');
      if (cached) {
        setCalls(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [user]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-gray-400 text-white',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      install: 'bg-blue-500 text-white',
      swap: 'bg-purple-500 text-white',
      deinstall: 'bg-gray-500 text-white',
      maintenance: 'bg-green-500 text-white',
      breakdown: 'bg-red-500 text-white',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const isOverdue = (scheduledDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  };

  const isToday = (scheduledDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled.getTime() === today.getTime();
  };

  const filteredCalls = calls.filter(call => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        call.call_number.toLowerCase().includes(query) ||
        call.client_name.toLowerCase().includes(query) ||
        call.client_address.toLowerCase().includes(query)
      );
    }

    switch (filter) {
      case 'assigned':
        return call.status === 'assigned';
      case 'in_progress':
        return call.status === 'in_progress';
      case 'overdue':
        return isOverdue(call.scheduled_date);
      case 'today':
        return isToday(call.scheduled_date);
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <OfflineQueueStatus />
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">My Calls</h1>
          <button
            onClick={fetchCalls}
            disabled={!isOnline || loading}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!isOnline && (
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm mb-3">
            <WifiOff className="w-4 h-4" />
            <span>Working offline. Changes will sync when online.</span>
          </div>
        )}

        {isOnline && (
          <div className="text-xs text-blue-200">
            Last synced: {lastSync.toLocaleTimeString()}
          </div>
        )}

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {(['all', 'assigned', 'in_progress', 'overdue', 'today'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              {f !== 'all' && (
                <span className="ml-1 text-xs">
                  ({calls.filter(c => {
                    if (f === 'assigned') return c.status === 'assigned';
                    if (f === 'in_progress') return c.status === 'in_progress';
                    if (f === 'overdue') return isOverdue(c.scheduled_date);
                    if (f === 'today') return isToday(c.scheduled_date);
                    return true;
                  }).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && !calls.length ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Loading calls...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 font-medium">No calls found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? 'Try a different search' : 'New calls will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                onClick={() => navigate(`/mobile/calls/${call.id}`)}
                className={`bg-white rounded-lg shadow-sm border-l-4 p-4 cursor-pointer active:bg-gray-50 transition-colors ${getPriorityColor(call.priority)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{call.call_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeBadge(call.type)}`}>
                        {call.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{call.client_name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityBadge(call.priority)}`}>
                    {call.priority.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{call.client_address}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(call.scheduled_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {isOverdue(call.scheduled_date) && call.status !== 'completed' && (
                  <div className="mt-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    OVERDUE
                  </div>
                )}

                {isToday(call.scheduled_date) && !isOverdue(call.scheduled_date) && (
                  <div className="mt-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    DUE TODAY
                  </div>
                )}

                {call.status === 'in_progress' && (
                  <div className="mt-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    IN PROGRESS
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
