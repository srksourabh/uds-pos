import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Store, MapPin, Phone, Mail, Edit, Eye } from 'lucide-react';

interface Merchant {
  id: string;
  mid: string;
  merchant_name: string;
  business_name: string | null;
  business_type: string | null;
  contact_person: string | null;
  contact_phone: string;
  contact_email: string | null;
  merchant_address: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  total_devices_installed: number;
  onboarded_date: string | null;
  last_service_date: string | null;
  bank?: { name: string; code: string };
}

export function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          *,
          bank:bank_id(name, code)
        `)
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
      merchant.contact_phone.includes(searchTerm) ||
      (merchant.city && merchant.city.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    churned: 'bg-orange-100 text-orange-800',
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
          <p className="text-gray-600 mt-2">Manage merchant locations and installations</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Merchant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{merchants.length}</p>
          <p className="text-sm text-gray-500">Total Merchants</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{merchants.filter(m => m.status === 'active').length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{merchants.reduce((sum, m) => sum + (m.total_devices_installed || 0), 0)}</p>
          <p className="text-sm text-gray-500">Devices Installed</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-orange-600">{merchants.filter(m => m.status === 'churned').length}</p>
          <p className="text-sm text-gray-500">Churned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, MID, phone, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
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
      </div>

      {/* Merchants Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Merchant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Devices</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No merchants found</p>
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{merchant.merchant_name}</p>
                        {merchant.business_name && (
                          <p className="text-xs text-gray-500">{merchant.business_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900">{merchant.mid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {merchant.contact_phone}
                        </div>
                        {merchant.contact_email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {merchant.contact_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-900 max-w-xs truncate">{merchant.merchant_address}</p>
                          <p className="text-xs text-gray-500">{merchant.city}, {merchant.state} {merchant.pincode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {merchant.bank ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {merchant.bank.code}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{merchant.total_devices_installed || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[merchant.status] || 'bg-gray-100 text-gray-800'}`}>
                        {merchant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedMerchant(merchant)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Merchant Details</h2>
                <button
                  onClick={() => setSelectedMerchant(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Merchant Name</p>
                  <p className="font-medium">{selectedMerchant.merchant_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MID</p>
                  <p className="font-mono font-medium">{selectedMerchant.mid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Name</p>
                  <p className="font-medium">{selectedMerchant.business_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Type</p>
                  <p className="font-medium">{selectedMerchant.business_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="font-medium">{selectedMerchant.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedMerchant.contact_phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{selectedMerchant.merchant_address}</p>
                  <p className="text-sm text-gray-600">{selectedMerchant.city}, {selectedMerchant.state} - {selectedMerchant.pincode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Devices Installed</p>
                  <p className="font-medium text-lg">{selectedMerchant.total_devices_installed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[selectedMerchant.status]}`}>
                    {selectedMerchant.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Onboarded Date</p>
                  <p className="font-medium">{selectedMerchant.onboarded_date || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Service Date</p>
                  <p className="font-medium">{selectedMerchant.last_service_date || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
