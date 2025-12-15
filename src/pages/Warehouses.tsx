import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Warehouse as WarehouseIcon, MapPin, Phone, Mail, Edit, Eye, Building2, Package } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  office_type: string | null;
  capacity: number | null;
  total_capacity: number | null;
  current_stock: number | null;
  is_active: boolean;
}

export function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const { data: warehouseData, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      setWarehouses(warehouseData || []);

      // Get device counts per warehouse
      const { data: devices } = await supabase
        .from('devices')
        .select('current_location_id')
        .eq('current_location_type', 'warehouse');

      const counts: Record<string, number> = {};
      (devices || []).forEach((d: { current_location_id: string | null }) => {
        if (d.current_location_id) {
          counts[d.current_location_id] = (counts[d.current_location_id] || 0) + 1;
        }
      });
      setDeviceCounts(counts);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter((warehouse) => {
    return (
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warehouse.city && warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const officeTypeColors: Record<string, string> = {
    head_office: 'bg-purple-100 text-purple-800',
    regional_office: 'bg-blue-100 text-blue-800',
    warehouse: 'bg-green-100 text-green-800',
    service_center: 'bg-orange-100 text-orange-800',
    hub: 'bg-yellow-100 text-yellow-800',
  };

  const officeTypeIcons: Record<string, any> = {
    head_office: Building2,
    regional_office: Building2,
    warehouse: WarehouseIcon,
    service_center: Package,
    hub: WarehouseIcon,
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
          <p className="text-gray-600 mt-2">Manage storage locations and regional offices</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
          <p className="text-sm text-gray-500">Total Locations</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{warehouses.filter(w => w.office_type === 'head_office').length}</p>
          <p className="text-sm text-gray-500">Head Offices</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{warehouses.filter(w => w.office_type === 'warehouse').length}</p>
          <p className="text-sm text-gray-500">Warehouses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{Object.values(deviceCounts).reduce((a, b) => a + b, 0)}</p>
          <p className="text-sm text-gray-500">Total Stock</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <WarehouseIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No locations found</p>
          </div>
        ) : (
          filteredWarehouses.map((warehouse) => {
            const Icon = officeTypeIcons[warehouse.office_type || 'warehouse'] || WarehouseIcon;
            const stockCount = deviceCounts[warehouse.id] || 0;
            const capacity = warehouse.total_capacity || warehouse.capacity || 1000;
            const utilizationPercent = Math.min((stockCount / capacity) * 100, 100);

            return (
              <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      warehouse.office_type === 'head_office' ? 'bg-purple-100' :
                      warehouse.office_type === 'regional_office' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        warehouse.office_type === 'head_office' ? 'text-purple-600' :
                        warehouse.office_type === 'regional_office' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                      <p className="text-sm text-gray-500">{warehouse.code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {warehouse.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    officeTypeColors[warehouse.office_type || 'warehouse'] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {(warehouse.office_type || 'warehouse').replace('_', ' ')}
                  </span>

                  {warehouse.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="line-clamp-2">{warehouse.address}</p>
                        {warehouse.city && (
                          <p className="text-gray-500">{warehouse.city}, {warehouse.state} {warehouse.pincode}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {warehouse.manager_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Manager:</span> {warehouse.manager_name}
                    </div>
                  )}

                  {warehouse.manager_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {warehouse.manager_phone}
                    </div>
                  )}
                </div>

                {/* Stock Utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Stock Level</span>
                    <span className="font-medium">{stockCount} / {capacity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        utilizationPercent > 90 ? 'bg-red-500' :
                        utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${utilizationPercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedWarehouse(warehouse)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warehouse Detail Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Location Details</h2>
                <button
                  onClick={() => setSelectedWarehouse(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedWarehouse.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Code</p>
                  <p className="font-mono font-medium">{selectedWarehouse.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    officeTypeColors[selectedWarehouse.office_type || 'warehouse']
                  }`}>
                    {(selectedWarehouse.office_type || 'warehouse').replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedWarehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedWarehouse.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{selectedWarehouse.address || '-'}</p>
                  {selectedWarehouse.city && (
                    <p className="text-sm text-gray-600">{selectedWarehouse.city}, {selectedWarehouse.state} - {selectedWarehouse.pincode}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Manager</p>
                  <p className="font-medium">{selectedWarehouse.manager_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedWarehouse.manager_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className="font-medium text-lg">{deviceCounts[selectedWarehouse.id] || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-medium text-lg">{selectedWarehouse.total_capacity || selectedWarehouse.capacity || 1000}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
