import { useState, useEffect } from 'react';
import { X, Package, Plus, Trash2, Search, Building2, User, Truck, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StockReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiptItem {
  serial_number: string;
  make: string;
  model: string;
  device_condition: 'new' | 'good' | 'fair' | 'faulty' | 'damaged';
  condition_notes: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Engineer {
  id: string;
  full_name: string;
  phone: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Courier {
  id: string;
  name: string;
  code: string;
}

type SourceType = 'customer' | 'engineer' | 'warehouse' | 'vendor' | 'service_center' | 'bank' | 'other';

export function StockReceiveModal({ isOpen, onClose, onSuccess }: StockReceiveModalProps) {
  const { userProfile } = useAuth();
  const [step, setStep] = useState<'source' | 'items' | 'review' | 'success'>('source');
  const [loading, setLoading] = useState(false);
  
  // Source info
  const [sourceType, setSourceType] = useState<SourceType>('customer');
  const [sourceId, setSourceId] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('');
  const [sourceContact, setSourceContact] = useState<string>('');
  const [sourcePhone, setSourcePhone] = useState<string>('');
  
  // Receipt info
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [courierTracking, setCourierTracking] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Items
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [newItem, setNewItem] = useState<ReceiptItem>({
    serial_number: '',
    make: 'Ingenico',
    model: '',
    device_condition: 'good',
    condition_notes: ''
  });
  
  // Lookups
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Result
  const [receiptNumber, setReceiptNumber] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadLookups();
    }
  }, [isOpen]);

  const loadLookups = async () => {
    const [customersRes, engineersRes, warehousesRes, couriersRes] = await Promise.all([
      supabase.from('customers').select('id, name').eq('status', 'active').order('name'),
      supabase.from('user_profiles').select('id, full_name, phone').eq('role', 'engineer').eq('status', 'active').order('full_name'),
      supabase.from('warehouses').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('couriers').select('id, name, code').eq('is_active', true).order('name')
    ]);
    
    if (customersRes.data) setCustomers(customersRes.data);
    if (engineersRes.data) setEngineers(engineersRes.data);
    if (warehousesRes.data) setWarehouses(warehousesRes.data);
    if (couriersRes.data) setCouriers(couriersRes.data);
  };

  const handleSourceSelect = (type: SourceType, id: string, name: string) => {
    setSourceType(type);
    setSourceId(id);
    setSourceName(name);
  };

  const addItem = () => {
    if (!newItem.serial_number.trim()) return;
    
    // Check for duplicate
    if (items.some(i => i.serial_number === newItem.serial_number)) {
      alert('This serial number is already added');
      return;
    }
    
    setItems([...items, { ...newItem }]);
    setNewItem({
      serial_number: '',
      make: newItem.make,
      model: newItem.model,
      device_condition: 'good',
      condition_notes: ''
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      // Generate receipt number
      const receiptNum = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('stock_receipts')
        .insert({
          receipt_number: receiptNum,
          source_type: sourceType,
          source_id: sourceId || null,
          source_name: sourceName,
          source_contact: sourceContact || null,
          source_phone: sourcePhone || null,
          destination_office_id: userProfile?.office_id || null,
          challan_number: challanNumber || null,
          courier_id: selectedCourier || null,
          courier_tracking: courierTracking || null,
          status: 'received',
          received_by: userProfile?.id,
          notes: notes || null
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const itemsToInsert = items.map(item => ({
        receipt_id: receipt.id,
        serial_number: item.serial_number,
        make: item.make,
        model: item.model,
        device_condition: item.device_condition,
        condition_notes: item.condition_notes || null
      }));

      const { error: itemsError } = await supabase
        .from('stock_receipt_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create devices for new items
      for (const item of items) {
        // Check if device already exists
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id')
          .eq('serial_number', item.serial_number)
          .maybeSingle();

        if (existingDevice) {
          // Update existing device
          await supabase
            .from('devices')
            .update({
              status: 'warehouse',
              device_condition: item.device_condition,
              current_location_type: 'warehouse',
              current_location_id: userProfile?.office_id,
              current_location_name: 'Received via ' + receiptNum,
              received_from_type: sourceType,
              received_from_name: sourceName,
              receiving_date: new Date().toISOString().split('T')[0],
              notes: item.condition_notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDevice.id);
        } else {
          // Create new device
          await supabase
            .from('devices')
            .insert({
              serial_number: item.serial_number,
              make: item.make,
              model: item.model,
              status: 'warehouse',
              device_condition: item.device_condition,
              current_location_type: 'warehouse',
              current_location_id: userProfile?.office_id,
              received_from_type: sourceType,
              received_from_name: sourceName,
              receiving_date: new Date().toISOString().split('T')[0],
              notes: item.condition_notes,
              office_id: userProfile?.office_id
            });
        }

        // Create stock movement
        await supabase
          .from('stock_movements')
          .insert({
            device_id: existingDevice?.id || null,
            movement_type: 'status_change',
            from_status: 'unknown',
            to_status: 'warehouse',
            from_location_type: sourceType,
            from_location_name: sourceName,
            to_location_type: 'warehouse',
            to_location_id: userProfile?.office_id,
            reason: `Received via ${receiptNum}`,
            actor_id: userProfile?.id,
            consignment_number: challanNumber || null
          });
      }

      setReceiptNumber(receiptNum);
      setStep('success');
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Failed to create receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('source');
    setSourceType('customer');
    setSourceId('');
    setSourceName('');
    setSourceContact('');
    setSourcePhone('');
    setChallanNumber('');
    setSelectedCourier('');
    setCourierTracking('');
    setNotes('');
    setItems([]);
    setReceiptNumber('');
  };

  if (!isOpen) return null;

  const filteredEngineers = engineers.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.phone.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-600 to-green-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Receive Stock
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {['source', 'items', 'review'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s || ['items', 'review', 'success'].indexOf(step) > i 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-500'}`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-16 h-1 mx-2 ${['items', 'review', 'success'].indexOf(step) > i ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Source Selection */}
          {step === 'source' && (
            <div className="space-y-6">
              <h3 className="font-medium text-gray-700">Who are you receiving from?</h3>
              
              {/* Source Type Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'customer' as SourceType, label: 'Customer', icon: Building2 },
                  { type: 'engineer' as SourceType, label: 'Engineer', icon: User },
                  { type: 'warehouse' as SourceType, label: 'Warehouse', icon: Package },
                  { type: 'vendor' as SourceType, label: 'Vendor', icon: Truck },
                  { type: 'other' as SourceType, label: 'Other', icon: Package },
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => { setSourceType(type); setSourceId(''); setSourceName(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition
                      ${sourceType === type 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Source Selection based on type */}
              {sourceType === 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                  <select
                    value={sourceId}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === e.target.value);
                      setSourceId(e.target.value);
                      setSourceName(customer?.name || '');
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'engineer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Engineer</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 p-3 border rounded-lg"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {filteredEngineers.map(eng => (
                      <div
                        key={eng.id}
                        onClick={() => {
                          setSourceId(eng.id);
                          setSourceName(eng.full_name);
                          setSourcePhone(eng.phone);
                        }}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-0
                          ${sourceId === eng.id ? 'bg-green-50' : ''}`}
                      >
                        <div className="font-medium">{eng.full_name}</div>
                        <div className="text-sm text-gray-500">{eng.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sourceType === 'warehouse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Warehouse</label>
                  <select
                    value={sourceId}
                    onChange={(e) => {
                      const wh = warehouses.find(w => w.id === e.target.value);
                      setSourceId(e.target.value);
                      setSourceName(wh?.name || '');
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {(sourceType === 'vendor' || sourceType === 'other') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="Enter name"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                      <input
                        type="text"
                        value={sourceContact}
                        onChange={(e) => setSourceContact(e.target.value)}
                        placeholder="Contact person"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="text"
                        value={sourcePhone}
                        onChange={(e) => setSourcePhone(e.target.value)}
                        placeholder="Phone number"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Details */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-gray-700">Delivery Details (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DC/Challan Number</label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      placeholder="DC/Challan number"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Courier</label>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="">-- Select Courier --</option>
                      {couriers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedCourier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Number</label>
                    <input
                      type="text"
                      value={courierTracking}
                      onChange={(e) => setCourierTracking(e.target.value)}
                      placeholder="Courier tracking number"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('items')}
                  disabled={!sourceName.trim()}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Continue to Add Items
                </button>
              </div>
            </div>
          )}

          {/* Step: Add Items */}
          {step === 'items' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Receiving from: <span className="font-medium text-gray-900">{sourceName}</span>
                  <span className="text-gray-400 ml-2">({sourceType})</span>
                </p>
              </div>

              {/* Add Item Form */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-700">Add Device</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number *</label>
                    <input
                      type="text"
                      value={newItem.serial_number}
                      onChange={(e) => setNewItem({ ...newItem, serial_number: e.target.value.toUpperCase() })}
                      placeholder="e.g., ING12345678"
                      className="w-full p-2 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <select
                      value={newItem.make}
                      onChange={(e) => setNewItem({ ...newItem, make: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Ingenico">Ingenico</option>
                      <option value="VeriFone">VeriFone</option>
                      <option value="PAX">PAX</option>
                      <option value="FUJIAN">FUJIAN</option>
                      <option value="Newland">Newland</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={newItem.model}
                      onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                      placeholder="e.g., iCT220"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={newItem.device_condition}
                      onChange={(e) => setNewItem({ ...newItem, device_condition: e.target.value as any })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="faulty">Faulty</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={newItem.condition_notes}
                    onChange={(e) => setNewItem({ ...newItem, condition_notes: e.target.value })}
                    placeholder="Any notes about the device condition"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={addItem}
                  disabled={!newItem.serial_number.trim()}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Device
                </button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="font-medium">{items.length} device(s) added</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                        <div>
                          <span className="font-mono font-medium">{item.serial_number}</span>
                          <span className="text-gray-500 ml-2">{item.make} {item.model}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded
                            ${item.device_condition === 'new' ? 'bg-green-100 text-green-700' :
                              item.device_condition === 'good' ? 'bg-blue-100 text-blue-700' :
                              item.device_condition === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'}`}
                          >
                            {item.device_condition}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('source')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  disabled={items.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Review & Submit
                </button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-700">Receipt Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Receiving from:</span>
                    <span className="ml-2 font-medium">{sourceName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">{sourceType}</span>
                  </div>
                  {challanNumber && (
                    <div>
                      <span className="text-gray-500">Challan:</span>
                      <span className="ml-2 font-medium">{challanNumber}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Total Items:</span>
                    <span className="ml-2 font-medium">{items.length}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b font-medium">Devices ({items.length})</div>
                <div className="max-h-48 overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-0">
                      <span className="font-mono">{item.serial_number}</span>
                      <span className="text-gray-500">{item.make} {item.model}</span>
                      <span className={`text-xs px-2 py-0.5 rounded
                        ${item.device_condition === 'new' ? 'bg-green-100 text-green-700' :
                          item.device_condition === 'good' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'}`}
                      >
                        {item.device_condition}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('items')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Stock Received Successfully!</h3>
                <p className="text-gray-600">Receipt Number: <span className="font-mono font-bold">{receiptNumber}</span></p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 inline-block">
                <p className="text-sm text-gray-600">
                  {items.length} device(s) added to inventory from {sourceName}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { reset(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Receive More
                </button>
                <button
                  onClick={() => { onSuccess(); onClose(); }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
