import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Warehouse, User, Truck, Building2, 
  ArrowRight, CheckCircle, XCircle, RefreshCw,
  Send, Download, Users, Store
} from 'lucide-react';

interface Device {
  id: string;
  serial_number: string;
  model: string;
  make: string;
  status: string;
  current_location_type: string;
  current_location_name: string;
  assigned_to: string | null;
}

interface Engineer {
  id: string;
  full_name: string;
  emp_id: string;
  email: string;
}

interface WarehouseType {
  id: string;
  name: string;
  code: string;
  office_type: string;
}

interface Courier {
  id: string;
  name: string;
  code: string;
}

interface Merchant {
  id: string;
  mid: string;
  merchant_name: string;
  merchant_address: string;
}

type TransferType = 
  | 'admin_to_warehouse' 
  | 'warehouse_receive'
  | 'warehouse_to_engineer' 
  | 'engineer_receive'
  | 'engineer_to_merchant'
  | 'engineer_to_engineer'
  | 'engineer_to_courier'
  | 'courier_to_office';

export function StockTransfer() {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transfer form state
  const [transferType, setTransferType] = useState<TransferType | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [notes, setNotes] = useState('');
  const [consignmentNumber, setConsignmentNumber] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const getFilteredDevices = () => {
    switch (transferType) {
      case 'admin_to_warehouse':
        return devices.filter(d => d.current_location_type === 'warehouse' || d.status === 'warehouse');
      case 'warehouse_receive':
        return devices.filter(d => d.status === 'warehouse');
      case 'warehouse_to_engineer':
        return devices.filter(d => d.current_location_type === 'warehouse' && d.status === 'warehouse');
      case 'engineer_receive':
        return devices.filter(d => d.assigned_to === profile?.id && d.status === 'issued');
      case 'engineer_to_merchant':
        return devices.filter(d => d.assigned_to === profile?.id || d.current_location_type === 'engineer');
      case 'engineer_to_engineer':
        return devices.filter(d => d.current_location_type === 'engineer' || d.status === 'issued');
      case 'engineer_to_courier':
        return devices.filter(d => d.current_location_type === 'engineer' || d.status === 'issued');
      case 'courier_to_office':
        return devices.filter(d => d.current_location_type === 'courier');
      default:
        return [];
    }
  };

  const handleTransfer = async () => {
    if (selectedDevices.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one device' });
      return;
    }

    if (!transferType) return;

    setSubmitting(true);
    setMessage(null);

    try {
      for (const deviceId of selectedDevices) {
        const device = devices.find(d => d.id === deviceId);
        if (!device) continue;

        let updateData: Record<string, any> = {};
        let movementData: Record<string, any> = {
          device_id: deviceId,
          actor_id: profile?.id,
          notes: notes,
          reason: getTransferReason(transferType),
          from_status: device.status,
          from_location_type: device.current_location_type,
          from_location_name: device.current_location_name,
        };

        switch (transferType) {
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
              to_location_name: targetWarehouse?.name
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
              requires_approval: true,
              approval_status: 'pending'
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
              mid: targetMerchant?.mid
            };
            break;

          case 'engineer_to_engineer':
            const toEngineer = engineers.find(e => e.id === targetId);
            updateData = {
              current_location_type: 'engineer',
              current_location_id: targetId,
              current_location_name: toEngineer?.full_name,
              assigned_to: targetId
            };
            movementData = {
              ...movementData,
              movement_type: 'transfer',
              to_status: device.status,
              to_location_type: 'engineer',
              to_location_id: targetId,
              to_location_name: toEngineer?.full_name,
              to_engineer: targetId,
              from_engineer: device.assigned_to
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
              movement_type: 'return',
              to_status: 'returned',
              to_location_type: 'courier',
              to_location_id: targetId,
              to_location_name: targetCourier?.name,
              courier_id: targetId,
              courier_name: targetCourier?.name,
              consignment_number: consignmentNumber
            };
            break;

          case 'courier_to_office':
            const headOffice = warehouses.find(w => w.office_type === 'head_office') || warehouses[0];
            updateData = {
              status: 'warehouse',
              current_location_type: 'warehouse',
              current_location_id: headOffice?.id,
              current_location_name: headOffice?.name,
              courier_id: null,
              return_date: new Date().toISOString().split('T')[0]
            };
            movementData = {
              ...movementData,
              movement_type: 'return',
              to_status: 'warehouse',
              to_location_type: 'warehouse',
              to_location_id: headOffice?.id,
              to_location_name: headOffice?.name
            };
            break;
        }

        // Update device
        await supabase.from('devices').update(updateData).eq('id', deviceId);

        // Create movement record
        await supabase.from('stock_movements').insert(movementData);
      }

      setMessage({ type: 'success', text: `Successfully transferred ${selectedDevices.length} device(s)` });
      setSelectedDevices([]);
      setTargetId('');
      setNotes('');
      setConsignmentNumber('');
      loadData();
    } catch (error) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: 'Failed to transfer devices' });
    } finally {
      setSubmitting(false);
    }
  };

  const getTransferReason = (type: TransferType): string => {
    const reasons: Record<TransferType, string> = {
      admin_to_warehouse: 'Admin transferred to warehouse',
      warehouse_receive: 'Warehouse received stock',
      warehouse_to_engineer: 'Issued to engineer from warehouse',
      engineer_receive: 'Engineer acknowledged receipt',
      engineer_to_merchant: 'Installed at merchant location',
      engineer_to_engineer: 'Transferred between engineers',
      engineer_to_courier: 'Sent via courier for return',
      courier_to_office: 'Received at office from courier'
    };
    return reasons[type];
  };

  const transferOptions: { type: TransferType; label: string; icon: any; color: string; description: string }[] = [
    { type: 'admin_to_warehouse', label: 'Admin → Warehouse', icon: Warehouse, color: 'bg-blue-500', description: 'Transfer stock to warehouse' },
    { type: 'warehouse_to_engineer', label: 'Warehouse → Engineer', icon: User, color: 'bg-green-500', description: 'Issue devices to field engineer' },
    { type: 'engineer_to_merchant', label: 'Engineer → Merchant', icon: Store, color: 'bg-purple-500', description: 'Install device at merchant' },
    { type: 'engineer_to_engineer', label: 'Engineer → Engineer', icon: Users, color: 'bg-orange-500', description: 'Transfer between engineers' },
    { type: 'engineer_to_courier', label: 'Engineer → Courier', icon: Truck, color: 'bg-red-500', description: 'Send device via courier' },
    { type: 'courier_to_office', label: 'Courier → Office', icon: Building2, color: 'bg-indigo-500', description: 'Receive from courier at office' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stock Transfer</h1>
        <p className="text-gray-600 mt-2">Move devices between locations with full audit trail</p>
      </div>

      {/* Transfer Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Transfer Type</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {transferOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                setTransferType(option.type);
                setSelectedDevices([]);
                setTargetId('');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                transferType === option.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 ${option.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                <option.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-900 text-center">{option.label}</p>
              <p className="text-xs text-gray-500 text-center mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
        </div>
      )}

      {/* Transfer Form */}
      {transferType && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {transferOptions.find(o => o.type === transferType)?.label}
            </h2>
            <button
              onClick={() => setTransferType(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Devices ({getFilteredDevices().length} available)
              </label>
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {getFilteredDevices().length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No devices available for this transfer type</p>
                ) : (
                  getFilteredDevices().map((device) => (
                    <label
                      key={device.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevices([...selectedDevices, device.id]);
                          } else {
                            setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{device.serial_number}</p>
                        <p className="text-xs text-gray-500">{device.make} {device.model} • {device.current_location_name || device.status}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {selectedDevices.length} device(s) selected
              </p>
            </div>

            {/* Target Selection */}
            <div className="space-y-4">
              {/* Target dropdown based on transfer type */}
              {(transferType === 'admin_to_warehouse' || transferType === 'courier_to_office') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Warehouse
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose warehouse...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code}) - {wh.office_type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(transferType === 'warehouse_to_engineer' || transferType === 'engineer_to_engineer') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Engineer
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose engineer...</option>
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.full_name} ({eng.emp_id || eng.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {transferType === 'engineer_to_merchant' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Merchant
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose merchant...</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.merchant_name} (MID: {m.mid})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {transferType === 'engineer_to_courier' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Courier
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose courier...</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignment/AWB Number
                    </label>
                    <input
                      type="text"
                      value={consignmentNumber}
                      onChange={(e) => setConsignmentNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this transfer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleTransfer}
                disabled={submitting || selectedDevices.length === 0 || (!targetId && transferType !== 'engineer_receive' && transferType !== 'warehouse_receive')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Transfer {selectedDevices.length} Device(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.current_location_type === 'warehouse').length}
              </p>
              <p className="text-sm text-gray-500">In Warehouse</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.current_location_type === 'engineer').length}
              </p>
              <p className="text-sm text-gray-500">With Engineers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.current_location_type === 'merchant' || d.status === 'installed').length}
              </p>
              <p className="text-sm text-gray-500">At Merchants</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.current_location_type === 'courier').length}
              </p>
              <p className="text-sm text-gray-500">In Transit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
