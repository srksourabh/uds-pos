import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import type { Database } from '../lib/database.types';

type Bank = Database['public']['Tables']['banks']['Row'];

interface CreateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCallModal({ isOpen, onClose, onSuccess }: CreateCallModalProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_bank: '',
    client_name: '',
    client_address: '',
    client_phone: '',
    type: 'install',
    priority: 'medium',
    scheduled_date: '',
    description: '',
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
        .from('calls')
        .insert({
          ...formData,
          status: 'pending',
          call_number: `CALL-${Date.now()}`,
        });

      if (error) throw error;

      onSuccess();
      setFormData({
        client_bank: '',
        client_name: '',
        client_address: '',
        client_phone: '',
        type: 'install',
        priority: 'medium',
        scheduled_date: '',
        description: '',
      });
    } catch (error: any) {
      alert(`Error creating call: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Call">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank *
          </label>
          <select
            required
            value={formData.client_bank}
            onChange={(e) => setFormData({ ...formData, client_bank: e.target.value })}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name *
          </label>
          <input
            type="text"
            required
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Branch or client name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <input
            type="text"
            required
            value={formData.client_address}
            onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Full address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.client_phone}
            onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1234567890"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="install">Install</option>
              <option value="swap">Swap</option>
              <option value="deinstall">De-install</option>
              <option value="maintenance">Maintenance</option>
              <option value="breakdown">Breakdown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <select
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Date *
          </label>
          <input
            type="date"
            required
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Additional details about the call..."
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating...' : 'Create Call'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
