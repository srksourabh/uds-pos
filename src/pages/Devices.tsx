import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Smartphone } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'] & {
  bank?: Database['public']['Tables']['banks']['Row'];
  assigned_engineer?: Database['public']['Tables']['user_profiles']['Row'];
};

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDevices();

    const channel = supabase
      .channel('devices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadDevices)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          bank:device_bank(id, name, code),
          assigned_engineer:assigned_to(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data as Device[]);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    warehouse: 'bg-gray-100 text-gray-800',
    issued: 'bg-yellow-100 text-yellow-800',
    installed: 'bg-green-100 text-green-800',
    faulty: 'bg-red-100 text-red-800',
    returned: 'bg-blue-100 text-blue-800',
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-2">Manage POS devices and inventory</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Device
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by serial number or model..."
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
              <option value="warehouse">Warehouse</option>
              <option value="issued">Issued</option>
              <option value="installed">Installed</option>
              <option value="faulty">Faulty</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No devices found</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Smartphone className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{device.serial_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{device.bank?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[device.status || 'warehouse']}`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.assigned_engineer?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.installed_at_client || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredDevices.length} of {devices.length} devices
        </p>
      </div>
    </div>
  );
}
