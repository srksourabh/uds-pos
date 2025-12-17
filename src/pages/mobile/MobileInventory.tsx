import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Search, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MobileInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadDevices();
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, banks(bank_code, bank_name)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading devices:', error);
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => {
    const matchesSearch = search === '' ||
      d.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      d.model.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || d.status === filter;

    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: devices.length,
    issued: devices.filter(d => d.status === 'issued').length,
    installed: devices.filter(d => d.status === 'installed').length,
    faulty: devices.filter(d => d.status === 'faulty').length,
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      issued: 'bg-blue-100 text-blue-800',
      installed: 'bg-green-100 text-green-800',
      faulty: 'bg-red-100 text-red-800',
      warehouse: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'faulty') return <AlertCircle className="w-4 h-4" />;
    if (status === 'installed') return <CheckCircle className="w-4 h-4" />;
    return <Package className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate('/mobile/calls')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="heading-3-responsive text-gray-900">My Inventory</h1>
            <p className="text-sm text-gray-600">{devices.length} devices assigned</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by serial or model..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading inventory...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No devices found</p>
            <p className="text-gray-500 text-sm mt-1">
              {search ? 'Try a different search term' : 'No devices assigned to you yet'}
            </p>
          </div>
        ) : (
          filteredDevices.map(device => (
            <div key={device.id} className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-lg mb-1">
                    {device.serial_number}
                  </div>
                  <div className="text-sm text-gray-600">{device.model}</div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                  {getStatusIcon(device.status)}
                  {device.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-gray-500">Bank</div>
                  <div className="text-sm font-medium text-gray-900">{device.banks?.bank_code}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-medium text-gray-900">
                    {device.installed_at_client || 'In stock'}
                  </div>
                </div>
              </div>

              {device.fault_description && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-red-600 font-medium mb-1">Fault Reported:</div>
                  <div className="text-sm text-gray-700">{device.fault_description}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
