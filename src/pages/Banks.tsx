import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Building2, Mail, Phone, MapPin } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Bank = Database['public']['Tables']['banks']['Row'];

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddBankModal({ isOpen, onClose, onSuccess }: AddBankModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('banks')
        .insert({
          name: formData.name,
          code: formData.code,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          active: true,
          is_active: true,
        });

      if (error) throw error;

      onSuccess();
      setFormData({
        name: '',
        code: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
      });
    } catch (error: any) {
      alert(`Error adding bank: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="heading-2-responsive text-gray-900">Add New Bank/Customer</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label-responsive">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
                placeholder="Bank of America"
              />
            </div>
            <div>
              <label className="form-label-responsive">
                Bank Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
                placeholder="BOA"
              />
            </div>
          </div>

          <div>
            <label className="form-label-responsive">
              Contact Person *
            </label>
            <input
              type="text"
              required
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="form-input-responsive focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label-responsive">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
                placeholder="contact@bank.com"
              />
            </div>
            <div>
              <label className="form-label-responsive">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="form-input-responsive focus:border-blue-500"
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <label className="form-label-responsive">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="form-input-responsive focus:border-blue-500"
              rows={3}
              placeholder="Full address"
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
              {loading ? 'Adding...' : 'Add Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Banks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadBanks();

    const channel = supabase
      .channel('banks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banks' }, loadBanks)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBanks(data);
    } catch (error) {
      console.error('Error loading banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBankStatus = async (bankId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('banks')
        .update({ active: !currentStatus, is_active: !currentStatus })
        .eq('id', bankId);

      if (error) throw error;
      loadBanks();
    } catch (error: any) {
      alert(`Error updating bank status: ${error.message}`);
    }
  };

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="heading-1-responsive text-gray-900">Banks & Customers</h1>
          <p className="text-gray-600 mt-2">Manage bank and customer organizations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Bank/Customer
        </button>
      </div>

      <div className="card-responsive mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBanks.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No banks found</p>
          </div>
        ) : (
          filteredBanks.map((bank) => (
            <div
              key={bank.id}
              className="card-responsive hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                    <span className="text-sm text-gray-600">{bank.code}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  bank.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {bank.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-3">
                {bank.contact_person && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{bank.contact_person}</span>
                  </div>
                )}
                {bank.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{bank.contact_email}</span>
                  </div>
                )}
                {bank.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{bank.contact_phone}</span>
                  </div>
                )}
                {bank.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{bank.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => toggleBankStatus(bank.id, bank.active)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition ${
                    bank.active
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {bank.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredBanks.length} of {banks.length} banks
        </p>
      </div>

      <AddBankModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadBanks();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
