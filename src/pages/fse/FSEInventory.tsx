import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, CheckCircle, ArrowUpCircle, RefreshCw,
  Loader2, AlertCircle, Truck, Box, ChevronRight, Send,
  Check, X, Clock, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Device {
  id: string;
  serial_number: string;
  model: string;
  make: string;
  device_condition: string;
  current_location_type: string;
  status: string;
  consignment_number?: string;
  consignment_date?: string;
  receiving_date?: string;
  tid?: string;
}

type TabType = 'acceptance' | 'return';

export default function FSEInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('acceptance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Stock Acceptance
  const [inTransitDevices, setInTransitDevices] = useState<Device[]>([]);
  const [acceptingDeviceId, setAcceptingDeviceId] = useState<string | null>(null);
  
  // Return Request
  const [myDevices, setMyDevices] = useState<Device[]>([]);
  const [returningDeviceId, setReturningDeviceId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState<Device | null>(null);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'acceptance') {
      loadInTransitDevices();
    } else {
      loadMyDevices();
    }
  }, [activeTab, user?.id]);

  // Load In-Transit devices assigned to this FSE
  const loadInTransitDevices = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('current_location_type', 'in_transit')
        .order('consignment_date', { ascending: false });

      if (error) throw error;
      setInTransitDevices(data || []);
    } catch (err) {
      console.error('Error loading in-transit devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load FSE's current inventory
  const loadMyDevices = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('current_location_type', 'engineer')
        .order('device_condition', { ascending: true });

      if (error) throw error;
      setMyDevices(data || []);
    } catch (err) {
      console.error('Error loading my devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Confirm receipt of in-transit device
  const handleConfirmReceipt = async (device: Device) => {
    if (!user?.id) return;
    
    setAcceptingDeviceId(device.id);

    try {
      // Update device: In_Transit -> Good_Device
      const { error: deviceError } = await supabase
        .from('devices')
        .update({
          current_location_type: 'engineer',
          device_condition: 'good',
          receiving_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (deviceError) throw deviceError;

      // Create stock movement record
      await supabase.from('stock_movements').insert({
        device_id: device.id,
        movement_type: 'status_change',
        from_status: 'in_transit',
        to_status: 'issued',
        from_location_type: 'courier',
        to_location_type: 'engineer',
        to_engineer: user.id,
        actor_id: user.id,
        reason: 'FSE confirmed receipt of in-transit device',
        consignment_number: device.consignment_number,
      });

      // Reload
      loadInTransitDevices();
      alert('Device receipt confirmed successfully!');
    } catch (err) {
      console.error('Error confirming receipt:', err);
      alert('Failed to confirm receipt');
    } finally {
      setAcceptingDeviceId(null);
    }
  };

  // Submit return request (marks as Field Return, pending Warehouse approval)
  const handleSubmitReturn = async () => {
    if (!showReturnModal || !user?.id || !returnReason.trim()) return;
    
    setReturningDeviceId(showReturnModal.id);

    try {
      // Update device condition to field_return and flag for approval
      // Note: FSE cannot set 'faulty' directly - only Coordinator can
      const { error: deviceError } = await supabase
        .from('devices')
        .update({
          device_condition: 'fair', // Mark as fair, waiting for inspection
          fault_description: returnReason,
          fault_reported_date: new Date().toISOString().split('T')[0],
          fault_reported_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', showReturnModal.id);

      if (deviceError) throw deviceError;

      // Create stock movement with requires_approval = true
      await supabase.from('stock_movements').insert({
        device_id: showReturnModal.id,
        movement_type: 'return',
        from_status: showReturnModal.device_condition,
        to_status: 'field_return',
        from_location_type: 'engineer',
        to_location_type: 'warehouse',
        from_engineer: user.id,
        actor_id: user.id,
        reason: returnReason,
        requires_approval: true,
        approval_status: 'pending',
      });

      // Reload
      loadMyDevices();
      setShowReturnModal(null);
      setReturnReason('');
      alert('Return request submitted for approval!');
    } catch (err) {
      console.error('Error submitting return:', err);
      alert('Failed to submit return request');
    } finally {
      setReturningDeviceId(null);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new': return 'bg-green-100 text-green-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'fair': return 'bg-yellow-100 text-yellow-700';
      case 'faulty': return 'bg-red-100 text-red-700';
      case 'damaged': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'acceptance', label: 'Stock Acceptance', icon: <Package size={18} /> },
    { id: 'return', label: 'Return Request', icon: <ArrowUpCircle size={18} /> },
  ];

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
              <h1 className="text-lg font-semibold text-gray-900">My Inventory</h1>
              <p className="text-xs text-gray-500">Stock management</p>
            </div>
          </div>
          <button
            onClick={() => activeTab === 'acceptance' ? loadInTransitDevices(true) : loadMyDevices(true)}
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
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tab Description */}
        <div className="mb-4">
          {activeTab === 'acceptance' ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
              <Truck size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">In-Transit Stock</p>
                <p className="text-xs text-blue-600">Confirm receipt of devices shipped to you. Status changes from In_Transit to Good_Device.</p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start gap-3">
              <Info size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Return Requests</p>
                <p className="text-xs text-orange-600">Submit return requests for removed or faulty devices. Coordinator approval required to mark as "Faulty".</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Loading inventory...</p>
          </div>
        ) : activeTab === 'acceptance' ? (
          /* Stock Acceptance Tab */
          inTransitDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No pending receipts</h3>
              <p className="text-sm text-gray-500">No devices are currently in transit to you</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                {inTransitDevices.length} device{inTransitDevices.length !== 1 ? 's' : ''} in transit
              </p>

              {inTransitDevices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{device.serial_number}</h3>
                      <p className="text-sm text-gray-600">{device.make} {device.model}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      In Transit
                    </span>
                  </div>

                  {device.consignment_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Box size={14} />
                      <span>AWB: {device.consignment_number}</span>
                    </div>
                  )}

                  {device.consignment_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Clock size={14} />
                      <span>Shipped: {format(parseISO(device.consignment_date), 'dd MMM yyyy')}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleConfirmReceipt(device)}
                    disabled={acceptingDeviceId === device.id}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {acceptingDeviceId === device.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    Confirm Receipt
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Return Request Tab */
          myDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No devices in inventory</h3>
              <p className="text-sm text-gray-500">Your inventory is empty</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                {myDevices.length} device{myDevices.length !== 1 ? 's' : ''} in your inventory
              </p>

              {myDevices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{device.serial_number}</h3>
                      <p className="text-sm text-gray-600">{device.make} {device.model}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConditionColor(device.device_condition)}`}>
                      {device.device_condition}
                    </span>
                  </div>

                  {device.tid && (
                    <p className="text-xs text-gray-500 mb-3">TID: {device.tid}</p>
                  )}

                  {/* Only show return button for devices that aren't already pending return */}
                  {device.fault_description ? (
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                      <Clock size={14} />
                      <span>Return pending approval</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowReturnModal(device)}
                      className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <Send size={18} />
                      Submit Return Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Return Request</h3>
              <button
                onClick={() => {
                  setShowReturnModal(null);
                  setReturnReason('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{showReturnModal.serial_number}</p>
              <p className="text-xs text-gray-600">{showReturnModal.make} {showReturnModal.model}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Return *
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe the issue or reason for return..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  This request will be sent to the Coordinator for approval. You cannot mark a device as "Faulty" directly - only the Coordinator can approve that status.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReturnModal(null);
                  setReturnReason('');
                }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={!returnReason.trim() || returningDeviceId === showReturnModal.id}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {returningDeviceId === showReturnModal.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
