import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Warehouse as WarehouseIcon, MapPin, Phone, Mail, Building2, Package } from 'lucide-react';

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  manager_name: string;
  manager_phone: string;
  contact_email: string;
  office_type: string;
  capacity: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
};

export function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const matchesSearch =
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warehouse.city || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || warehouse.office_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const typeColors: Record<string, string> = {
    head_office: 'bg-purple-100 text-purple-700',
    regional_office: 'bg-blue-100 text-blue-700',
    warehouse: 'bg-green-100 text-green-700',
    service_center: 'bg-orange-100 text-orange-700',
    hub: 'bg-teal-100 text-teal-700',
  };

  const typeLabels: Record<string, string> = {
    head_office: 'Head Office',
    regional_office: 'Regional Office',
    warehouse: 'Warehouse',
    service_center: 'Service Center',
    hub: 'Hub',
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
          <h1 className="text-3xl font-bold text-gray-900">Warehouses & Offices</h1>
          <p className="text-gray-600 mt-2">Manage storage locations and offices</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <WarehouseIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
              <p className="text-xs text-gray-500">Total Locations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.filter(w => w.office_type === 'head_office').length}</p>
              <p className="text-xs text-gray-500">Head Offices</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <WarehouseIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.filter(w => w.office_type === 'warehouse').length}</p>
              <p className="text-xs text-gray-500">Warehouses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.filter(w => w.is_active).length}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warehouses.reduce((sum, w) => sum + (w.current_stock || 0), 0)}</p>
              <p className="text-xs text-gray-500">Total Stock</p>
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
              placeholder="Search by name, code, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="head_office">Head Office</option>
            <option value="regional_office">Regional Office</option>
            <option value="warehouse">Warehouse</option>
            <option value="service_center">Service Center</option>
            <option value="hub">Hub</option>
          </select>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <WarehouseIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No locations found</p>
          </div>
        ) : (
          filteredWarehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{warehouse.name}</h3>
                  <p className="text-sm font-mono text-gray-500">{warehouse.code}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${typeColors[warehouse.office_type] || 'bg-gray-100 text-gray-700'}`}>
                  {typeLabels[warehouse.office_type] || warehouse.office_type}
                </span>
              </div>

              {warehouse.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <div>
                    <p>{warehouse.address}</p>
                    <p className="text-gray-500">{warehouse.city}, {warehouse.state} {warehouse.pincode}</p>
                  </div>
                </div>
              )}

              {warehouse.manager_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{warehouse.manager_name}</span>
                </div>
              )}

              {warehouse.manager_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{warehouse.manager_phone}</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current Stock</p>
                  <p className="text-lg font-bold text-gray-900">{warehouse.current_stock || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-lg font-bold text-gray-900">{warehouse.capacity || warehouse.total_capacity || 1000}</p>
                </div>
                <div className={`px-3 py-1 text-xs font-medium rounded-full ${warehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {warehouse.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredWarehouses.length} of {warehouses.length} locations
      </div>
    </div>
  );
}
