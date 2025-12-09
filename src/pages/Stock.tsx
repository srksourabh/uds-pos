import { useState } from 'react';
import { useDevices, useIssueDevices, useMarkDeviceFaulty } from '../lib/api-hooks';
import { supabase } from '../lib/supabase';
import { Package, Search, Upload, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Stock() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({
    status: 'all',
    bank: 'all',
    assignedTo: 'all',
    search: '',
  });

  const { data: devices, loading } = useDevices(filters);
  const { issueDevices, loading: issuing } = useIssueDevices();
  const { markFaulty } = useMarkDeviceFaulty();

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFaultyModal, setShowFaultyModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const [banks, setBanks] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);

  useState(() => {
    supabase.from('banks').select('*').then(({ data }) => setBanks(data || []));
    supabase.from('user_profiles').select('*').eq('role', 'engineer').then(({ data }) => setEngineers(data || []));
  });

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map((d: any) => d.id));
    }
  };

  const handleIssueDevices = async (engineerId: string) => {
    try {
      await issueDevices({
        deviceIds: selectedDevices,
        engineerId,
      });
      setSelectedDevices([]);
      setShowIssueModal(false);
      alert('Devices issued successfully');
    } catch (error: any) {
      alert(`Error: ${error.error || error.message}`);
    }
  };

  const handleMarkFaulty = async (data: any) => {
    try {
      await markFaulty({
        deviceId: selectedDevice.id,
        ...data,
      });
      setShowFaultyModal(false);
      setSelectedDevice(null);
      alert('Device marked as faulty');
    } catch (error: any) {
      alert(`Error: ${error.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      warehouse: 'bg-gray-100 text-gray-800',
      issued: 'bg-blue-100 text-blue-800',
      installed: 'bg-green-100 text-green-800',
      faulty: 'bg-red-100 text-red-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-1">Manage device inventory and stock movements</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              disabled={selectedDevices.length === 0}
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Issue Selected ({selectedDevices.length})
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by serial or model..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="warehouse">Warehouse</option>
            <option value="issued">Issued</option>
            <option value="installed">Installed</option>
            <option value="faulty">Faulty</option>
            <option value="in_transit">In Transit</option>
          </select>

          <select
            value={filters.bank}
            onChange={(e) => setFilters({ ...filters, bank: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Banks</option>
            {banks.map(bank => (
              <option key={bank.id} value={bank.id}>{bank.bank_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No devices found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDevices.length === devices.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device: any) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleSelectDevice(device.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-gray-900">{device.serial_number}</td>
                  <td className="px-6 py-4 text-gray-600">{device.model}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{device.banks?.bank_code}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {device.installed_at_client || device.assigned_to || 'Warehouse'}
                  </td>
                  <td className="px-6 py-4">
                    {device.status !== 'faulty' && (
                      <button
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowFaultyModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Mark Faulty
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showIssueModal && <IssueDevicesModal
        engineers={engineers}
        onClose={() => setShowIssueModal(false)}
        onSubmit={handleIssueDevices}
        loading={issuing}
      />}

      {showFaultyModal && <MarkFaultyModal
        device={selectedDevice}
        onClose={() => {
          setShowFaultyModal(false);
          setSelectedDevice(null);
        }}
        onSubmit={handleMarkFaulty}
      />}
    </div>
  );
}

function IssueDevicesModal({ engineers, onClose, onSubmit, loading }: any) {
  const [engineerId, setEngineerId] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Issue Devices to Engineer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Engineer</label>
            <select
              value={engineerId}
              onChange={(e) => setEngineerId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an engineer...</option>
              {engineers.map((eng: any) => (
                <option key={eng.user_id} value={eng.user_id}>
                  {eng.full_name} - {eng.banks?.bank_code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(engineerId)}
              disabled={!engineerId || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Issuing...' : 'Issue Devices'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkFaultyModal({ device, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    faultDescription: '',
    faultCategory: 'Hardware',
    severity: 'minor',
    requiresRepair: true,
    estimatedCost: 0,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Mark Device as Faulty</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Device: {device?.serial_number}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fault Description*</label>
            <textarea
              value={formData.faultDescription}
              onChange={(e) => setFormData({ ...formData, faultDescription: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the fault in detail (min 20 characters)..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
            <select
              value={formData.faultCategory}
              onChange={(e) => setFormData({ ...formData, faultCategory: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Physical Damage">Physical Damage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity*</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(formData)}
              disabled={formData.faultDescription.length < 20}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Mark as Faulty
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
