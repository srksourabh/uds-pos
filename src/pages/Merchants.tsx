import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Store, MapPin, Phone, Mail, Building2 } from 'lucide-react';

type Merchant = {
  id: string;
  mid: string;
  merchant_name: string;
  business_name: string;
  business_type: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  merchant_address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  bank_id: string;
  bank?: { name: string };
  total_devices_installed: number;
  created_at: string;
};

export function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select(`*, bank:bank_id(name)`)
        .order('merchant_name');

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = merchants.filter((merchant) => {
    const matchesSearch =
      merchant.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.mid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (merchant.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (merchant.contact_phone || '').includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
    churned: 'bg-orange-100 text-orange-700',
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-600 mt-2">Manage merchant locations and details</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Merchant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{merchants.length}</p>
              <p className="text-xs text-gray-500">Total Merchants</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{merchants.filter(m => m.status === 'active').length}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Store className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{merchants.filter(m => m.status === 'inactive').length}</p>
              <p className="text-xs text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{merchants.reduce((sum, m) => sum + (m.total_devices_installed || 0), 0)}</p>
              <p className="text-xs text-gray-500">Devices Installed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, MID, city, phone..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="churned">Churned</option>
          </select>
        </div>
      </div>

      {/* Merchants Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">MID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Merchant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Bank</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Devices</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No merchants found</p>
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50 transition cursor-pointer">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{merchant.mid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{merchant.merchant_name}</p>
                        {merchant.business_name && (
                          <p className="text-xs text-gray-500">{merchant.business_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {merchant.contact_phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {merchant.contact_phone}
                          </div>
                        )}
                        {merchant.contact_email && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail className="w-3 h-3" />
                            {merchant.contact_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                        <div>
                          <p className="line-clamp-1">{merchant.merchant_address}</p>
                          <p className="text-xs text-gray-500">{merchant.city}, {merchant.state} {merchant.pincode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{merchant.bank?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-semibold text-gray-900">{merchant.total_devices_installed || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[merchant.status] || 'bg-gray-100 text-gray-700'}`}>
                        {merchant.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredMerchants.length} of {merchants.length} merchants
      </div>
    </div>
  );
}
