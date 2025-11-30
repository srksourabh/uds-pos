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

export function AddDeviceModal({ isOpen, onClose, onSuccess }: AddDeviceModalProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: '',
    model: '',
    device_bank: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadBanks();
    }
  }, [isOpen]);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBanks(data);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('devices')
        .insert({
          serial_number: formData.serial_number,
          model: formData.model,
          device_bank: formData.device_bank,
          status: 'warehouse',
          current_location: 'warehouse',
        });

      if (error) throw error;

      onSuccess();
      setFormData({
        serial_number: '',
        model: '',
        device_bank: '',
      });
    } catch (error: any) {
      alert(`Error adding device: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Device">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serial Number *
          </label>
          <input
            type="text"
            required
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="SN123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model *
          </label>
          <input
            type="text"
            required
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="PAX S920"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank *
          </label>
          <select
            required
            value={formData.device_bank}
            onChange={(e) => setFormData({ ...formData, device_bank: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a bank</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name} ({bank.code})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Device will be added to warehouse inventory with status "warehouse"
          </p>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Adding...' : 'Add Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
