import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Truck, Package, CheckCircle, Clock, Upload, Download, X, Calendar, Building } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Shipment = Database['public']['Tables']['shipments']['Row'] & {
  courier?: Database['public']['Tables']['couriers']['Row'];
};

type Courier = Database['public']['Tables']['couriers']['Row'];
type Bank = Database['public']['Tables']['banks']['Row'];

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateShipmentModal({ isOpen, onClose, onSuccess }: CreateShipmentModalProps) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [customers, setCustomers] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    consignment_name: '',
    consignment_number: '',
    consignment_date: new Date().toISOString().split('T')[0],
    courier_id: '',
    customer_id: '',
    device_serials: '',
    source_type: 'warehouse',
    destination_type: 'engineer',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCouriers();
      loadCustomers();
      setFormData({
        consignment_name: '',
        consignment_number: '',
        consignment_date: new Date().toISOString().split('T')[0],
        courier_id: '',
        customer_id: '',
        device_serials: '',
        source_type: 'warehouse',
        destination_type: 'engineer',
        notes: '',
      });
    }
  }, [isOpen]);

  const loadCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error loading couriers:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const deviceIds = formData.device_serials
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      const { error } = await supabase
        .from('shipments')
        .insert({
          tracking_number: formData.consignment_number,
          consignment_name: formData.consignment_name,
          consignment_number: formData.consignment_number,
          consignment_date: formData.consignment_date,
          courier_id: formData.courier_id || null,
          customer_id: formData.customer_id || null,
          device_ids: deviceIds,
          source_type: formData.source_type as 'warehouse' | 'engineer' | 'bank',
          destination_type: formData.destination_type as 'warehouse' | 'engineer' | 'bank' | 'client',
          status: 'in_transit' as const,
          shipped_at: new Date().toISOString(),
          notes: formData.notes,
        });

      if (error) throw error;

      // Update devices to in_transit status
      if (deviceIds.length > 0) {
        await supabase
          .from('devices')
          .update({ 
            status: 'in_transit',
            whereabouts: 'intransit'
          })
          .in('serial_number', deviceIds);
      }

      onSuccess();
    } catch (error: any) {
      alert(`Error creating shipment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="heading-2-responsive text-gray-900">Create New Shipment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Consignment Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Consignment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consignment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.consignment_name}
                  onChange={(e) => setFormData({ ...formData, consignment_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., HPS Batch 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consignment Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.consignment_number}
                  onChange={(e) => setFormData({ ...formData, consignment_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  placeholder="AWB123456789"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consignment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.consignment_date}
                  onChange={(e) => setFormData({ ...formData, consignment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Courier Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Courier & Route
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Courier
                </label>
                <select
                  value={formData.courier_id}
                  onChange={(e) => setFormData({ ...formData, courier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select courier</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="engineer">Engineer</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <select
                    value={formData.destination_type}
                    onChange={(e) => setFormData({ ...formData, destination_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="engineer">Engineer</option>
                    <option value="bank">Bank</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Serial Numbers <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.device_serials}
              onChange={(e) => setFormData({ ...formData, device_serials: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              rows={3}
              placeholder="Enter serial numbers separated by commas"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple serial numbers with commas. Devices will be marked as "In Transit".</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Creating...' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CSV Import Modal
interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Bank[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadLookupData();
      setStep('upload');
      setParsedData([]);
      setResults({ success: 0, failed: 0, errors: [] });
    }
  }, [isOpen]);

  const loadLookupData = async () => {
    const [customersRes, couriersRes] = await Promise.all([
      supabase.from('banks').select('*').eq('active', true),
      supabase.from('couriers').select('*').eq('is_active', true)
    ]);
    setCustomers(customersRes.data || []);
    setCouriers(couriersRes.data || []);
  };

  const downloadTemplate = () => {
    const headers = [
      'consignment_name',
      'consignment_number',
      'consignment_date',
      'customer_code',
      'courier_code',
      'device_type',
      'device_serial_number',
      'source_type',
      'destination_type',
      'notes'
    ];

    const sampleRow = [
      'HPS Batch 1',
      'AWB123456789',
      '2025-12-25',
      'HDFC',
      'BLUEDART',
      'POS Terminal',
      'SN123456789',
      'warehouse',
      'engineer',
      'Sample shipment'
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'shipment_import_template.csv';
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
        const row: any = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setParsedData(data);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    setLoading(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Group by consignment number
    const grouped = parsedData.reduce((acc, row) => {
      const key = row.consignment_number || '';
      if (!acc[key]) {
        acc[key] = { ...row, devices: [] };
      }
      if (row.device_serial_number) {
        acc[key].devices.push(row.device_serial_number);
      }
      return acc;
    }, {} as Record<string, any>);

    for (const consignmentNum of Object.keys(grouped)) {
      const shipmentData = grouped[consignmentNum];
      try {
        // Find customer
        const customer = customers.find(c => 
          c.code?.toLowerCase() === shipmentData.customer_code?.toLowerCase() ||
          c.name?.toLowerCase() === shipmentData.customer_code?.toLowerCase()
        );

        // Find courier
        const courier = couriers.find(c => 
          c.code?.toLowerCase() === shipmentData.courier_code?.toLowerCase() ||
          c.name?.toLowerCase() === shipmentData.courier_code?.toLowerCase()
        );

        const { error } = await supabase
          .from('shipments')
          .insert({
            tracking_number: shipmentData.consignment_number,
            consignment_name: shipmentData.consignment_name,
            consignment_number: shipmentData.consignment_number,
            consignment_date: shipmentData.consignment_date || null,
            courier_id: courier?.id || null,
            customer_id: customer?.id || null,
            device_ids: shipmentData.devices,
            source_type: shipmentData.source_type || 'warehouse',
            destination_type: shipmentData.destination_type || 'engineer',
            status: 'in_transit',
            shipped_at: new Date().toISOString(),
            notes: shipmentData.notes || null,
          });

        if (error) throw error;
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${consignmentNum}: ${error.message}`);
      }
    }

    setResults({ success, failed, errors });
    setStep('results');
    setLoading(false);
    if (success > 0) onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Import Shipments from CSV</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="text-center py-8">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-600 mb-6">Upload a CSV file with shipment details</p>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select File
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview ({parsedData.length} rows)</h3>
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Consignment Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Consignment #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Device Serial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{row._rowIndex}</td>
                        <td className="px-3 py-2">{row.consignment_name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.consignment_number}</td>
                        <td className="px-3 py-2">{row.consignment_date}</td>
                        <td className="px-3 py-2">{row.customer_code}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.device_serial_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 50 && (
                <p className="text-sm text-gray-500 mt-2">Showing first 50 rows of {parsedData.length}</p>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setStep('upload'); setParsedData([]); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={processImport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Shipments'}
                </button>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">{results.success}</p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
              </div>
              {results.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto mb-4">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700">{err}</p>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InTransit() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('shipments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, loadShipments)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadShipments(), loadCustomers()]);
  };

  const loadShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          courier:courier_id(id, name, code, contact_phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments((data ?? []) as unknown as Shipment[]);
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data } = await supabase.from('banks').select('*').eq('active', true);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Create customer lookup map
  const customerMap = customers.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<string, Bank>);

  const updateShipmentStatus = async (shipmentId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', shipmentId);

      if (error) throw error;
      loadShipments();
    } catch (error: any) {
      alert(`Error updating shipment: ${error.message}`);
    }
  };

  // Tab counts
  const statusCounts = {
    all: shipments.length,
    in_transit: shipments.filter(s => s.status === 'in_transit').length,
    pending: shipments.filter(s => s.status === 'pending').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    returned: shipments.filter(s => s.status === 'returned').length,
  };

  const filteredShipments = shipments.filter((shipment) => {
    const searchLower = searchTerm.toLowerCase();
    const consignmentName = shipment.consignment_name?.toLowerCase() || '';
    const consignmentNumber = shipment.consignment_number?.toLowerCase() || '';
    const trackingNumber = shipment.tracking_number?.toLowerCase() || '';
    const customerName = shipment.customer_id ? (customerMap[shipment.customer_id]?.name?.toLowerCase() || '') : '';
    
    const matchesSearch = 
      consignmentName.includes(searchLower) ||
      consignmentNumber.includes(searchLower) ||
      trackingNumber.includes(searchLower) ||
      customerName.includes(searchLower) ||
      shipment.device_ids.some(id => id.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Consignment Name', 'Consignment Number', 'Consignment Date', 'Customer', 'Courier', 'AWB/Tracking', 'Devices', 'Route', 'Status', 'Shipped At', 'Delivered At'];
    const rows = filteredShipments.map(s => [
      s.consignment_name || '',
      s.consignment_number || '',
      s.consignment_date || '',
      s.customer_id ? (customerMap[s.customer_id]?.name || '') : '',
      s.courier?.name || '',
      s.tracking_number,
      s.device_ids.join('; '),
      `${s.source_type} → ${s.destination_type}`,
      s.status,
      s.shipped_at ? new Date(s.shipped_at).toLocaleString() : '',
      s.delivered_at ? new Date(s.delivered_at).toLocaleString() : '',
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    returned: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
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
          <h1 className="heading-1-responsive text-gray-900">In Transit</h1>
          <p className="text-gray-600 mt-2">Track consignments and device shipments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowCSVImport(true)}
            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Shipment
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 min-w-max">
          {[
            { key: 'all', label: 'All' },
            { key: 'in_transit', label: 'In Transit' },
            { key: 'pending', label: 'Pending' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'returned', label: 'Returned' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
                statusFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                statusFilter === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {statusCounts[tab.key as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="card-responsive mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by consignment name, number, or device serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredShipments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No shipments found</p>
          </div>
        ) : (
          filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="card-responsive hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {shipment.consignment_name || shipment.tracking_number}
                      </h3>
                      <p className="text-sm text-gray-600 font-mono">
                        {shipment.consignment_number || shipment.tracking_number}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {shipment.customer_id && customerMap[shipment.customer_id] && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Customer:</span>
                        <span className="font-medium text-gray-900">{customerMap[shipment.customer_id].name}</span>
                      </div>
                    )}
                    {shipment.consignment_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(shipment.consignment_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {shipment.courier?.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Courier:</span>
                        <span className="font-medium text-gray-900">{shipment.courier.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {shipment.source_type} → {shipment.destination_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{shipment.device_ids.length} device(s):</span>
                    <span className="font-mono text-xs text-gray-700">
                      {shipment.device_ids.slice(0, 3).join(', ')}
                      {shipment.device_ids.length > 3 && ` +${shipment.device_ids.length - 3} more`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {shipment.shipped_at && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        Shipped: {new Date(shipment.shipped_at).toLocaleString()}
                      </div>
                    )}
                    {shipment.delivered_at && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Delivered: {new Date(shipment.delivered_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {shipment.notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">{shipment.notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <span className={`px-3 py-1 text-sm font-medium rounded ${statusColors[shipment.status]}`}>
                    {shipment.status.replace('_', ' ').toUpperCase()}
                  </span>

                  {shipment.status === 'in_transit' && (
                    <button
                      onClick={() => updateShipmentStatus(shipment.id, 'delivered')}
                      className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredShipments.length} of {shipments.length} shipments
        </p>
      </div>

      <CreateShipmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadShipments();
          setShowCreateModal(false);
        }}
      />

      <CSVImportModal
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onSuccess={loadShipments}
      />
    </div>
  );
}
