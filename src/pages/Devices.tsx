import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Smartphone, Upload, UserPlus, CheckSquare } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { BulkImportModal } from '../components/BulkImportModal';
import { IssueDeviceModal } from '../components/IssueDeviceModal';
import { AddDeviceModal } from '../components/AddDeviceModal';

type Device = Database['public']['Tables']['devices']['Row'] & {
  bank_name?: string;
  assigned_name?: string;
};

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [engineerMap, setEngineerMap] = useState<Map<string, string>>(new Map());
  const [bankMap, setBankMap] = useState<Map<string, string>>(new Map());

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
      // Load lookup data first
      const [engineersRes, banksRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name').eq('role', 'engineer'),
        supabase.from('banks').select('id, name')
      ]);

      const engMap = new Map<string, string>();
      (engineersRes.data || []).forEach(eng => {
        engMap.set(eng.id, eng.full_name || 'Unknown');
      });
      setEngineerMap(engMap);

      const bnkMap = new Map<string, string>();
      (banksRes.data || []).forEach(bank => {
        bnkMap.set(bank.id, bank.name || 'Unknown');
      });
      setBankMap(bnkMap);

      // Load devices with simple query (no FK joins to avoid 400 errors)
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with lookup data
      const enrichedDevices = (data || []).map(device => ({
        ...device,
        bank_name: device.device_bank ? bnkMap.get(device.device_bank) : undefined,
        assigned_name: device.assigned_to ? engMap.get(device.assigned_to) : undefined,
      }));

      setDevices(enrichedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (device.serial_number || '').toLowerCase().includes(searchLower) ||
      (device.model || '').toLowerCase().includes(searchLower) ||
      (device.make || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    warehouse: 'bg-gray-100 text-gray-800',
    issued: 'bg-yellow-100 text-yellow-800',
    installed: 'bg-green-100 text-green-800',
    faulty: 'bg-red-100 text-red-800',
    returned: 'bg-blue-100 text-blue-800',
    // Phase 2: New statuses (Step 1.2)
    in_transit: 'bg-purple-100 text-purple-800',
    field_return: 'bg-orange-100 text-orange-800',
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelection = new Set(selectedDevices);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    setSelectedDevices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const getSelectedDeviceObjects = () => {
    return devices.filter(d => selectedDevices.has(d.id));
  };

  const handleIssueDevices = () => {
    const selected = getSelectedDeviceObjects();
    const warehouseDevices = selected.filter(d => ['warehouse', 'returned'].includes(d.status));
    if (warehouseDevices.length === 0) {
      alert('Please select devices with warehouse or returned status');
      return;
    }
    setShowIssueModal(true);
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
          <h1 className="heading-1-responsive text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-2">Manage POS devices and inventory</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import CSV
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

      {selectedDevices.size > 0 && (
        <div className="mb-responsive bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedDevices.size} device{selectedDevices.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleIssueDevices}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Issue to Engineer
              </button>
              <button
                onClick={() => setSelectedDevices(new Set())}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-responsive mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by serial number, model or make..."
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
                <th className="table-td-responsive text-left">
                  <input
                    type="checkbox"
                    checked={selectedDevices.size === filteredDevices.length && filteredDevices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Model
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bank
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="table-td-responsive text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No devices found</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50 transition">
                    <td className="table-td-responsive">
                      <input
                        type="checkbox"
                        checked={selectedDevices.has(device.id)}
                        onChange={() => toggleDeviceSelection(device.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="table-td-responsive whitespace-nowrap">
                      <div className="flex items-center">
                        <Smartphone className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{device.serial_number}</span>
                      </div>
                    </td>
                    <td className="table-td-responsive whitespace-nowrap text-sm text-gray-600">
                      {device.model || '-'}
                    </td>
                    <td className="table-td-responsive whitespace-nowrap">
                      <span className="text-sm text-gray-900">{device.bank_name || 'N/A'}</span>
                    </td>
                    <td className="table-td-responsive whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[device.status || 'warehouse']}`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="table-td-responsive whitespace-nowrap text-sm text-gray-600">
                      {device.assigned_name || '-'}
                    </td>
                    <td className="table-td-responsive whitespace-nowrap text-sm text-gray-600">
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

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          loadDevices();
          setShowBulkImport(false);
        }}
      />

      <IssueDeviceModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        selectedDevices={getSelectedDeviceObjects().filter(d => ['warehouse', 'returned'].includes(d.status))}
        onSuccess={() => {
          loadDevices();
          setSelectedDevices(new Set());
          setShowIssueModal(false);
        }}
      />

      <AddDeviceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadDevices();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
