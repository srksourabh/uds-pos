import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Package, Plus, ArrowRight, AlertTriangle, Download, Upload, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddDeviceModal } from '../components/AddDeviceModal';
import { StockReceiveModal } from '../components/StockReceiveModal';
import { useAuth } from '../contexts/AuthContext';

interface Device {
  id: string;
  serial_number: string;
  make: string | null;
  model: string | null;
  status: string;
  device_condition: string | null;
  current_location_type: string | null;
  current_location_name: string | null;
  tid: string | null;
  assigned_to: string | null;
  office_id: string | null;
  created_at: string;
  engineer?: {
    id: string;
    full_name: string;
  } | null;
  office?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export function Stock() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    loadDevices();
    loadWarehouses();

    const channel = supabase
      .channel('devices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadDevices)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');
    if (data) setWarehouses(data);
  };

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          engineer:assigned_to(id, full_name),
          office:office_id(id, name, code)
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
      device.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.tid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    const matchesWarehouse = warehouseFilter === 'all' || device.office_id === warehouseFilter;
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  const statusColors: Record<string, string> = {
    warehouse: 'bg-blue-100 text-blue-800',
    issued: 'bg-yellow-100 text-yellow-800',
    installed: 'bg-green-100 text-green-800',
    faulty: 'bg-red-100 text-red-800',
    returned: 'bg-gray-100 text-gray-800',
  };

  const conditionColors: Record<string, string> = {
    new: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    faulty: 'bg-red-100 text-red-700',
    damaged: 'bg-red-100 text-red-700',
  };

  // Count by status
  const statusCounts = {
    all: devices.length,
    warehouse: devices.filter(d => d.status === 'warehouse').length,
    issued: devices.filter(d => d.status === 'issued').length,
    installed: devices.filter(d => d.status === 'installed').length,
    faulty: devices.filter(d => d.status === 'faulty').length,
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
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-2">Manage POS devices and inventory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReceiveModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Receive Stock
          </button>
          <button
            onClick={() => navigate('/stock-transfer')}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Transfer
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Device
          </button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === status 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600 capitalize">{status === 'all' ? 'Total' : status}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by serial number, TID, make, or model..."
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
          <div className="flex items-center gap-2">
            <Building2 className="text-gray-400 w-5 h-5" />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No devices found</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 font-mono">{device.serial_number}</div>
                          <div className="text-sm text-gray-500">{device.make} {device.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600">{device.tid || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[device.status]}`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {device.device_condition ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${conditionColors[device.device_condition] || 'bg-gray-100 text-gray-700'}`}>
                          {device.device_condition}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {device.office?.name || device.current_location_name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {device.current_location_type || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {device.engineer?.full_name || '-'}
                      </div>
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

      <AddDeviceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadDevices();
          setShowAddModal(false);
        }}
      />

      <StockReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        onSuccess={() => {
          loadDevices();
        }}
      />
    </div>
  );
}
