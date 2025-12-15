import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Warehouse, User, Truck, Building2, ArrowRight, 
  Check, X, Search, RefreshCw, ChevronDown, ChevronUp,
  Send, Download, Users, Store
} from 'lucide-react';

type Device = {
  id: string;
  serial_number: string;
  model: string;
  make: string;
  status: string;
  current_location_type: string;
  current_location_name: string;
  current_location_id: string;
  assigned_to: string | null;
};

type Engineer = {
  id: string;
  full_name: string;
  emp_id: string;
  email: string;
};

type WarehouseType = {
  id: string;
  name: string;
  code: string;
  office_type: string;
};

type Courier = {
  id: string;
  name: string;
  code: string;
};

type Merchant = {
  id: string;
  mid: string;
  merchant_name: string;
  merchant_address: string;
};

type TransferAction = 
  | 'admin_to_warehouse'
  | 'warehouse_receive'
  | 'warehouse_to_engineer'
  | 'engineer_receive'
  | 'engineer_to_merchant'
  | 'engineer_to_engineer'
  | 'engineer_to_courier'
  | 'courier_to_office';

export function StockTransfer() {
  const { user, profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Selection states
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<TransferAction | null>(null);
  const [targetId, setTargetId] = useState<string>('');
  const [consignmentNumber, setConsignmentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('actions');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, engineersRes, warehousesRes, couriersRes, merchantsRes] = await Promise.all([
        supabase.from('devices').select('*').order('serial_number'),
        supabase.from('user_profiles').select('id, full_name, emp_id, email').eq('role', 'engineer').eq('status', 'active'),
        supabase.from('warehouses').select('*').eq('is_active', true),
        supabase.from('couriers').select('*').eq('is_active', true),
        supabase.from('merchants').select('id, mid, merchant_name, merchant_address').eq('status', 'active').limit(100)
      ]);

      setDevices(devicesRes.data || []);
      setEngineers(engineersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setCouriers(couriersRes.data || []);
      setMerchants(merchantsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const transferActions: { id: TransferAction; label: string; icon: React.ReactNode; description: string; color: string }[] = [
    { id: 'admin_to_warehouse', label: 'Admin → Warehouse', icon: <Warehouse className="w-5 h-5" />, description: 'Transfer stock from admin to warehouse', color: 'bg-blue-500' },
    { id: 'warehouse_receive', label: 'Warehouse Receive', icon: <Download className="w-5 h-5" />, description: 'Warehouse receives incoming stock', color: 'bg-green-500' },
    { id: 'warehouse_to_engineer', label: 'Warehouse → Engineer', icon: <User className="w-5 h-5" />, description: 'Issue stock from warehouse to engineer', color: 'bg-purple-500' },
    { id: 'engineer_receive', label: 'Engineer Receive', icon: <Check className="w-5 h-5" />, description: 'Engineer receives assigned stock', color: 'bg-teal-500' },
    { id: 'engineer_to_merchant', label: 'Engineer → Merchant', icon: <Store className="w-5 h-5" />, description: 'Install device at merchant location', color: 'bg-orange-500' },
    { id: 'engineer_to_engineer', label: 'Engineer → Engineer', icon: <Users className="w-5 h-5" />, description: 'Transfer stock between engineers', color: 'bg-indigo-500' },
    { id: 'engineer_to_courier', label: 'Engineer → Courier', icon: <Truck className="w-5 h-5" />, description: 'Send stock via courier', color: 'bg-amber-500' },
    { id: 'courier_to_office', label: 'Courier → Office', icon: <Building2 className="w-5 h-5" />, description: 'Courier delivers to head office', color: 'bg-red-500' },
  ];

  const getFilteredDevices = () => {
    return devices.filter(device => {
      const matchesSearch = 
        device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.make || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = filterLocation === 'all' || device.current_location_type === filterLocation;
      
      return matchesSearch && matchesLocation;
    });
  };

  const getTargetOptions = () => {
    switch (selectedAction) {
      case 'admin_to_warehouse':
      case 'courier_to_office':
        return warehouses.map(w => ({ id: w.id, label: `${w.name} (${w.code})` }));
      case 'warehouse_to_engineer':
      case 'engineer_to_engineer':
        return engineers.map(e => ({ id: e.id, label: `${e.full_name} (${e.emp_id || e.email})` }));
      case 'engineer_to_courier':
        return couriers.map(c => ({ id: c.id, label: `${c.name} (${c.code})` }));
      case 'engineer_to_merchant':
        return merchants.map(m => ({ id: m.id, label: `${m.merchant_name} (${m.mid})` }));
      default:
        return [];
    }
  };

  const handleTransfer = async () => {
    if (selectedDevices.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one device' });
      return;
    }

    if (!selectedAction) {
      setMessage({ type: 'error', text: 'Please select a transfer action' });
      return;
    }

    const needsTarget = ['admin_to_warehouse', 'warehouse_to_engineer', 'engineer_to_engineer', 'engineer_to_courier', 'engineer_to_merchant', 'courier_to_office'].includes(selectedAction);
    if (needsTarget && !targetId) {
      setMessage({ type: 'error', text: 'Please select a target destination' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      for (const deviceId of selectedDevices) {
        const device = devices.find(d => d.id === deviceId);
        if (!device) continue;

        let updateData: Partial<Device> = {};
        let movementData: any = {
          device_id: deviceId,
          actor_id: user?.id,
          notes: notes,
          from_status: device.status,
          from_location_type: device.current_location_type,
          from_location_id: device.current_location_id,
          from_location_name: device.current_location_name,
        };

        switch (selectedAction) {
          case 'admin_to_warehouse':
            const targetWarehouse = warehouses.find(w => w.id === targetId);
            updateData = {
              status: 'warehouse',
              current_location_type: 'warehouse',
              current_location_id: targetId,
              current_location_name: targetWarehouse?.name,
              assigned_to: null
            };
            movementData = {
              ...movementData,
              movement_type: 'transfer',
              to_status: 'warehouse',
              to_location_type: 'warehouse',
              to_location_id: targetId,
              to_location_name: targetWarehouse?.name,
              reason: `Transferred to warehouse: ${targetWarehouse?.name}`
            };
            break;

          case 'warehouse_receive':
            updateData = {
              status: 'warehouse',
              current_location_type: 'warehouse',
            };
            movementData = {
              ...movementData,
              movement_type: 'return',
              to_status: 'warehouse',
              reason: 'Warehouse received stock'
            };
            break;

          case 'warehouse_to_engineer':
            const targetEngineer = engineers.find(e => e.id === targetId);
            updateData = {
              status: 'issued',
              current_location_type: 'engineer',
              current_location_id: targetId,
              current_location_name: targetEngineer?.full_name,
              assigned_to: targetId
            };
            movementData = {
              ...movementData,
              movement_type: 'issuance',
              to_status: 'issued',
              to_location_type: 'engineer',
              to_location_id: targetId,
              to_location_name: targetEngineer?.full_name,
              to_engineer: targetId,
              reason: `Issued to engineer: ${targetEngineer?.full_name}`
            };
            break;

          case 'engineer_receive':
            updateData = {
              status: 'issued',
            };
            movementData = {
              ...movementData,
              movement_type: 'assignment',
              to_status: 'issued',
              reason: 'Engineer received stock'
            };
            break;

          case 'engineer_to_merchant':
            const targetMerchant = merchants.find(m => m.id === targetId);
            updateData = {
              status: 'installed',
              current_location_type: 'merchant',
              current_location_id: targetId,
              current_location_name: targetMerchant?.merchant_name,
              merchant_id: targetId,
              installed_at_mid: targetMerchant?.mid,
              installation_date: new Date().toISOString().split('T')[0]
            };
            movementData = {
              ...movementData,
              movement_type: 'transfer',
              to_status: 'installed',
              to_location_type: 'merchant',
              to_location_id: targetId,
              to_location_name: targetMerchant?.merchant_name,
              merchant_id: targetId,
              mid: targetMerchant?.mid,
              reason: `Installed at merchant: ${targetMerchant?.merchant_name} (${targetMerchant?.mid})`
            };
            break;

          case 'engineer_to_engineer':
            const toEngineer = engineers.find(e => e.id === targetId);
            updateData = {
              status: 'issued',
              current_location_type: 'engineer',
              current_location_id: targetId,
              current_location_name: toEngineer?.full_name,
              assigned_to: targetId
            };
            movementData = {
              ...movementData,
              movement_type: 'transfer',
              to_status: 'issued',
              to_location_type: 'engineer',
              to_location_id: targetId,
              to_location_name: toEngineer?.full_name,
              from_engineer: device.assigned_to,
              to_engineer: targetId,
              reason: `Transferred to engineer: ${toEngineer?.full_name}`
            };
            break;

          case 'engineer_to_courier':
            const targetCourier = couriers.find(c => c.id === targetId);
            updateData = {
              status: 'returned',
              current_location_type: 'courier',
              current_location_id: targetId,
              current_location_name: targetCourier?.name,
              courier_id: targetId,
              consignment_number: consignmentNumber,
              consignment_date: new Date().toISOString().split('T')[0]
            };
            movementData = {
              ...movementData,
              movement_type: 'transfer',
              to_status: 'returned',
              to_location_type: 'courier',
              to_location_id: targetId,
              to_location_name: targetCourier?.name,
              courier_id: targetId,
              courier_name: targetCourier?.name,
              consignment_number: consignmentNumber,
              reason: `Sent via courier: ${targetCourier?.name} (AWB: ${consignmentNumber})`
            };
            break;

          case 'courier_to_office':
            const targetOffice = warehouses.find(w => w.id === targetId);
            updateData = {
              status: 'warehouse',
              current_location_type: 'warehouse',
              current_location_id: targetId,
              current_location_name: targetOffice?.name,
              assigned_to: null,
              courier_id: null
            };
            movementData = {
              ...movementData,
              movement_type: 'return',
              to_status: 'warehouse',
              to_location_type: 'warehouse',
              to_location_id: targetId,
              to_location_name: targetOffice?.name,
              reason: `Delivered to office: ${targetOffice?.name}`
            };
            break;
        }

        // Update device
        await supabase.from('devices').update(updateData).eq('id', deviceId);

        // Record movement
        await supabase.from('stock_movements').insert(movementData);
      }

      setMessage({ type: 'success', text: `Successfully processed ${selectedDevices.length} device(s)` });
      setSelectedDevices([]);
      setTargetId('');
      setConsignmentNumber('');
      setNotes('');
      loadData();
    } catch (error: any) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: error.message || 'Transfer failed' });
    } finally {
      setProcessing(false);
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredDevices();
    setSelectedDevices(filtered.map(d => d.id));
  };

  const clearSelection = () => {
    setSelectedDevices([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Transfer</h1>
          <p className="text-gray-600 mt-1">Manage device movements between locations</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              <p className="text-xs text-gray-500">Total Devices</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Warehouse className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.current_location_type === 'warehouse').length}</p>
              <p className="text-xs text-gray-500">In Warehouse</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.current_location_type === 'engineer').length}</p>
              <p className="text-xs text-gray-500">With Engineers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.current_location_type === 'merchant').length}</p>
              <p className="text-xs text-gray-500">At Merchants</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.current_location_type === 'courier').length}</p>
              <p className="text-xs text-gray-500">In Transit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Transfer Actions</span>
            {selectedAction && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {transferActions.find(a => a.id === selectedAction)?.label}
              </span>
            )}
          </div>
          {expandedSection === 'actions' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        
        {expandedSection === 'actions' && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {transferActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action.id);
                    setTargetId('');
                  }}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    selectedAction === action.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`inline-flex p-2 rounded-lg text-white mb-2 ${action.color}`}>
                    {action.icon}
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                </button>
              ))}
            </div>

            {/* Target Selection */}
            {selectedAction && getTargetOptions().length > 0 && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Target {selectedAction === 'engineer_to_courier' ? 'Courier' : selectedAction.includes('warehouse') || selectedAction === 'courier_to_office' ? 'Warehouse/Office' : selectedAction === 'engineer_to_merchant' ? 'Merchant' : 'Engineer'}
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select --</option>
                    {getTargetOptions().map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {selectedAction === 'engineer_to_courier' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignment/AWB Number
                    </label>
                    <input
                      type="text"
                      value={consignmentNumber}
                      onChange={(e) => setConsignmentNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Device Selection */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="warehouse">Warehouse</option>
              <option value="engineer">Engineer</option>
              <option value="merchant">Merchant</option>
              <option value="courier">Courier</option>
            </select>
            <div className="flex gap-2">
              <button onClick={selectAllFiltered} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                Select All
              </button>
              <button onClick={clearSelection} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Select</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Serial Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Make</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getFilteredDevices().map((device) => (
                <tr 
                  key={device.id} 
                  onClick={() => toggleDeviceSelection(device.id)}
                  className={`cursor-pointer transition ${selectedDevices.includes(device.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => toggleDeviceSelection(device.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{device.serial_number}</td>
                  <td className="px-4 py-3 text-gray-600">{device.model}</td>
                  <td className="px-4 py-3 text-gray-600">{device.make || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      device.status === 'warehouse' ? 'bg-green-100 text-green-700' :
                      device.status === 'issued' ? 'bg-blue-100 text-blue-700' :
                      device.status === 'installed' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {device.current_location_type}: {device.current_location_name || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transfer Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">{selectedDevices.length}</span> device(s) selected
          </p>
          <button
            onClick={handleTransfer}
            disabled={processing || selectedDevices.length === 0 || !selectedAction}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5 mr-2" />
                Execute Transfer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
