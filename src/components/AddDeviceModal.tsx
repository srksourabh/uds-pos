import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import type { Database } from '../lib/database.types';

type Bank = Database['public']['Tables']['banks']['Row'];

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEVICE_CATEGORIES = [
  { value: 'pos_terminal', label: 'POS Terminal' },
  { value: 'mpos', label: 'MPOS' },
  { value: 'soundbox', label: 'Sound Box' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'printer', label: 'Printer' },
  { value: 'other', label: 'Other' },
];

const DEVICE_MAKES = [
  { value: 'PAX', label: 'PAX' },
  { value: 'Ingenico', label: 'Ingenico' },
  { value: 'VeriFone', label: 'VeriFone' },
  { value: 'FUJIAN', label: 'FUJIAN' },
  { value: 'Newland', label: 'Newland' },
  { value: 'Morefun', label: 'Morefun' },
  { value: 'IMIN', label: 'IMIN' },
  { value: 'Other', label: 'Other' },
];

export function AddDeviceModal({ isOpen, onClose, onSuccess }: AddDeviceModalProps) {
  const [customers, setCustomers] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    device_category: '',
    make: '',
    model: '',
    serial_number: '',
    tid: '',
    receiving_date: new Date().toISOString().split('T')[0],
    condition_status: 'good',
    whereabouts: 'warehouse',
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      setFormData({
        customer_id: '',
        device_category: '',
        make: '',
        model: '',
        serial_number: '',
        tid: '',
        receiving_date: new Date().toISOString().split('T')[0],
        condition_status: 'good',
        whereabouts: 'warehouse',
      });
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const generateUniqueEntryId = () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `UDS${dateStr}${random}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: existing, error: checkError } = await supabase
        .from('devices')
        .select('id')
        .eq('customer_id', formData.customer_id)
        .eq('serial_number', formData.serial_number)
        .eq('receiving_date', formData.receiving_date)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        alert('A device with this Customer + Receiving Date + Serial Number combination already exists.');
        setLoading(false);
        return;
      }

      const unique_entry_id = generateUniqueEntryId();

      const { error } = await supabase
        .from('devices')
        .insert({
          unique_entry_id,
          serial_number: formData.serial_number,
          model: formData.model,
          make: formData.make,
          tid: formData.tid || null,
          device_bank: formData.customer_id,
          customer_id: formData.customer_id,
          device_category: formData.device_category,
          receiving_date: formData.receiving_date,
          condition_status: formData.condition_status,
          whereabouts: formData.whereabouts,
          status: 'warehouse',
          current_location: 'warehouse',
        });

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      alert(`Error adding device: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Device">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
                {customer.name} ({customer.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Category <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.device_category}
            onChange={(e) => setFormData({ ...formData, device_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Select category</option>
            {DEVICE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Make <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Select make</option>
              {DEVICE_MAKES.map((make) => (
                <option key={make.value} value={make.value}>
                  {make.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g., S920, D210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            placeholder="SN123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TID <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            value={formData.tid}
            onChange={(e) => setFormData({ ...formData, tid: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            placeholder="TID12345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receiving Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.receiving_date}
            onChange={(e) => setFormData({ ...formData, receiving_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={formData.condition_status}
              onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="good">Good</option>
              <option value="faulty">Faulty</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Whereabouts
            </label>
            <select
              value={formData.whereabouts}
              onChange={(e) => setFormData({ ...formData, whereabouts: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="warehouse">Warehouse</option>
              <option value="intransit">In Transit</option>
              <option value="engineer">With Engineer</option>
              <option value="installed">Installed</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> A unique Entry ID will be auto-generated. Duplicate entries 
            (same Customer + Receiving Date + Serial Number) will be rejected.
          </p>
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
            {loading ? 'Adding...' : 'Add Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
