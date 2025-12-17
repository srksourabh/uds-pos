import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Truck, Package, CheckCircle, Clock } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Shipment = Database['public']['Tables']['shipments']['Row'] & {
  courier?: Database['public']['Tables']['couriers']['Row'];
};

type Courier = Database['public']['Tables']['couriers']['Row'];

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateShipmentModal({ isOpen, onClose, onSuccess }: CreateShipmentModalProps) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: '',
    courier_id: '',
    device_serials: '',
    source_type: 'warehouse',
    destination_type: 'engineer',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCouriers();
    }
  }, [isOpen]);

  const loadCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCouriers(data);
    } catch (error) {
      console.error('Error loading couriers:', error);
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
          tracking_number: formData.tracking_number,
          courier_id: formData.courier_id,
          device_ids: deviceIds,
          source_type: formData.source_type as 'warehouse' | 'engineer' | 'bank',
          destination_type: formData.destination_type as 'warehouse' | 'engineer' | 'bank' | 'client',
          status: 'in_transit' as const,
          shipped_at: new Date().toISOString(),
          notes: formData.notes,
        });

      if (error) throw error;

      onSuccess();
      setFormData({
        tracking_number: '',
        courier_id: '',
        device_serials: '',
        source_type: 'warehouse',
        destination_type: 'engineer',
        notes: '',
      });
    } catch (error: any) {
      alert(`Error creating shipment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="heading-2-responsive text-gray-900">Create New Shipment</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label-responsive">
                Courier *
              </label>
              <select
                required
                value={formData.courier_id}
                onChange={(e) => setFormData({ ...formData, courier_id: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
              >
                <option value="">Select courier</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-responsive">
                Tracking Number *
              </label>
              <input
                type="text"
                required
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
                placeholder="TRK123456789"
              />
            </div>
          </div>

          <div>
            <label className="form-label-responsive">
              Device Serial Numbers *
            </label>
            <textarea
              required
              value={formData.device_serials}
              onChange={(e) => setFormData({ ...formData, device_serials: e.target.value })}
              className="form-input-responsive focus:border-blue-500"
              rows={3}
              placeholder="Enter serial numbers separated by commas"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple serial numbers with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label-responsive">
                Source Type *
              </label>
              <select
                required
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
              >
                <option value="warehouse">Warehouse</option>
                <option value="engineer">Engineer</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="form-label-responsive">
                Destination Type *
              </label>
              <select
                required
                value={formData.destination_type}
                onChange={(e) => setFormData({ ...formData, destination_type: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
              >
                <option value="warehouse">Warehouse</option>
                <option value="engineer">Engineer</option>
                <option value="bank">Bank</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label-responsive">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input-responsive focus:border-blue-500"
              rows={2}
              placeholder="Additional shipment notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
              className="btn-primary-responsive disabled:opacity-50 transition"
            >
              {loading ? 'Creating...' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InTransit() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('in_transit');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadShipments();

    const channel = supabase
      .channel('shipments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, loadShipments)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

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

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.device_ids.some(id => id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    returned: 'bg-red-100 text-red-800',
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
          <p className="text-gray-600 mt-2">Track device shipments with courier tracking</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Shipment
        </button>
      </div>

      <div className="card-responsive mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by tracking number or device serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
          </select>
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
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {shipment.tracking_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {shipment.courier?.name || 'Unknown Courier'}
                        {shipment.courier?.contact_phone && (
                          <span className="ml-2">• {shipment.courier.contact_phone}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {shipment.source_type} → {shipment.destination_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {shipment.device_ids.length} device(s):
                      </span>
                      <span className="font-mono text-xs text-gray-700">
                        {shipment.device_ids.slice(0, 3).join(', ')}
                        {shipment.device_ids.length > 3 && ` +${shipment.device_ids.length - 3} more`}
                      </span>
                    </div>
                    {shipment.shipped_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        Shipped: {new Date(shipment.shipped_at).toLocaleString()}
                      </div>
                    )}
                    {shipment.delivered_at && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Delivered: {new Date(shipment.delivered_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {shipment.notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{shipment.notes}</p>
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
    </div>
  );
}
