import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import type { Database } from '../lib/database.types';

type Bank = Database['public']['Tables']['banks']['Row'];

interface AddEngineerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEngineerModal({ isOpen, onClose, onSuccess }: AddEngineerModalProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    bank_id: '',
    password: '',
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'engineer',
            status: 'active',
            active: true,
            bank_id: formData.bank_id || null,
          });

        if (profileError) throw profileError;
      }

      onSuccess();
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        bank_id: '',
        password: '',
      });
    } catch (error: any) {
      alert(`Error creating engineer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Engineer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="engineer@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assigned Bank
          </label>
          <select
            value={formData.bank_id}
            onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a bank (optional)</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name} ({bank.code})
              </option>
            ))}
          </select>
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
            {loading ? 'Creating...' : 'Add Engineer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
