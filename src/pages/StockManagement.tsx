import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Filter, Upload, Download, Package, Warehouse, Users, 
  ArrowRight, ArrowLeftRight, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, FileSpreadsheet, Eye, Edit, 
  Plus, Minus, Truck, RotateCcw, Check, X, MoreVertical
} from 'lucide-react';

type Device = {
  id: string;
  serial_number: string;
  model: string;
  make?: string;
  part_category?: string;
  status: string;
  current_location: string | null;
  assigned_to: string | null;
  device_bank: string;
  created_at: string;
  banks?: { id: string; name: string; code: string };
  user_profiles?: { id: string; full_name: string; phone: string | null };
};

type Engineer = {
  id: string;
  full_name: string;
  phone: string | null;
  office_id: string | null;
};

type WarehouseType = {
  id: string;
  name: string;
  code: string;
  address: string | null;
};

type StockMovement = {
  id: string;
  device_id: string;
  movement_type: string;
  from_status: string;
  to_status: string;
  from_engineer: string | null;
  to_engineer: string | null;
  from_location: string | null;
  to_location: string | null;
  reason: string;
  notes: string;
  actor_id: string;
  created_at: string;
};

export function StockManagement() {
  const { profile, isStockManager, isSuperAdmin } = useAuth();
  
  // Data states
  const [devices, setDevices] = useState<Device[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    location: 'all',
    engineer: 'all',
    category: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Form states
  const [newStock, setNewStock] = useState({
    serial_number: '',
    model: '',
    make: '',
    part_category: 'POS Terminal',
    warehouse_id: '',
    quantity: 1,
  });

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'summary'>('inventory');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, engineersRes, warehousesRes, movementsRes] = await Promise.all([
        supabase.from('devices').select(`
          *,
          banks!device_bank(id, name, code),
          user_profiles!assigned_to(id, full_name, phone)
        `).order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').eq('role', 'engineer').eq('status', 'active'),
        supabase.from('warehouses').select('*').eq('active', true),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      setDevices(devicesRes.data || []);
      setEngineers(engineersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setMovements(movementsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(devices.map(d => d.part_category).filter(Boolean));
    return Array.from(cats);
  }, [devices]);

  // Filter devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const searchMatch = filters.search === '' || 
        device.serial_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        device.model?.toLowerCase().includes(filters.search.toLowerCase()) ||
        device.make?.toLowerCase().includes(filters.search.toLowerCase());
      
      const statusMatch = filters.status === 'all' || device.status === filters.status;
      const locationMatch = filters.location === 'all' || device.current_location === filters.location;
      const engineerMatch = filters.engineer === 'all' || device.assigned_to === filters.engineer;
      const categoryMatch = filters.category === 'all' || device.part_category === filters.category;

      return searchMatch && statusMatch && locationMatch && engineerMatch && categoryMatch;
    });
  }, [devices, filters]);

  // Summary stats
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    
    devices.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      if (d.current_location) {
        byLocation[d.current_location] = (byLocation[d.current_location] || 0) + 1;
      }
    });

    return { byStatus, byLocation, total: devices.length };
  }, [devices]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map(d => d.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual selection
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // Add new stock
  const handleAddStock = async () => {
    if (!newStock.serial_number || !newStock.model || !newStock.warehouse_id) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const warehouse = warehouses.find(w => w.id === newStock.warehouse_id);
      
      const { error } = await supabase.from('devices').insert({
        serial_number: newStock.serial_number,
        model: newStock.model,
        make: newStock.make,
        part_category: newStock.part_category,
        status: 'warehouse',
        current_location: warehouse?.name || newStock.warehouse_id,
        device_bank: '44444444-4444-4444-4444-444444444444', // Default bank
      });

      if (error) throw error;

      // Log movement
      await logMovement({
        device_id: 'new',
        movement_type: 'status_change',
        from_status: 'new',
        to_status: 'warehouse',
        to_location: warehouse?.name,
        reason: 'Stock addition',
        notes: `Added to ${warehouse?.name}`,
      });

      alert('Stock added successfully');
      setShowAddStockModal(false);
      setNewStock({
        serial_number: '',
        model: '',
        make: '',
        part_category: 'POS Terminal',
        warehouse_id: '',
        quantity: 1,
      });
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Transfer stock between locations
  const handleTransfer = async (toLocation: string) => {
    const devicesToTransfer = selectedDevice ? [selectedDevice.id] : selectedDevices;
    
    if (devicesToTransfer.length === 0) {
      alert('No devices selected');
      return;
    }

    try {
      const warehouse = warehouses.find(w => w.id === toLocation);
      const locationName = warehouse?.name || toLocation;

      const { error } = await supabase
        .from('devices')
        .update({ 
          current_location: locationName,
          status: 'in_transit',
          updated_at: new Date().toISOString()
        })
        .in('id', devicesToTransfer);

      if (error) throw error;

      // Log movements
      for (const deviceId of devicesToTransfer) {
        const device = devices.find(d => d.id === deviceId);
        await logMovement({
          device_id: deviceId,
          movement_type: 'transfer',
          from_status: device?.status || 'warehouse',
          to_status: 'in_transit',
          from_location: device?.current_location,
          to_location: locationName,
          reason: 'Stock transfer',
          notes: `Transferred to ${locationName}`,
        });
      }

      alert(`${devicesToTransfer.length} device(s) transferred`);
      setShowTransferModal(false);
      setSelectedDevices([]);
      setSelectedDevice(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Issue stock to engineer
  const handleIssue = async (engineerId: string) => {
    const devicesToIssue = selectedDevice ? [selectedDevice.id] : selectedDevices;
    
    if (devicesToIssue.length === 0) {
      alert('No devices selected');
      return;
    }

    try {
      const engineer = engineers.find(e => e.id === engineerId);

      const { error } = await supabase
        .from('devices')
        .update({ 
          assigned_to: engineerId,
          status: 'issued',
          updated_at: new Date().toISOString()
        })
        .in('id', devicesToIssue);

      if (error) throw error;

      // Log movements
      for (const deviceId of devicesToIssue) {
        const device = devices.find(d => d.id === deviceId);
        await logMovement({
          device_id: deviceId,
          movement_type: 'issuance',
          from_status: device?.status || 'warehouse',
          to_status: 'issued',
          from_location: device?.current_location,
          to_engineer: engineerId,
          reason: 'Stock issuance',
          notes: `Issued to ${engineer?.full_name}`,
        });
      }

      alert(`${devicesToIssue.length} device(s) issued to ${engineer?.full_name}`);
      setShowIssueModal(false);
      setSelectedDevices([]);
      setSelectedDevice(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Return stock from engineer
  const handleReturn = async (toLocation: string) => {
    const devicesToReturn = selectedDevice ? [selectedDevice.id] : selectedDevices;
    
    if (devicesToReturn.length === 0) {
      alert('No devices selected');
      return;
    }

    try {
      const warehouse = warehouses.find(w => w.id === toLocation);
      const locationName = warehouse?.name || toLocation;

      const { error } = await supabase
        .from('devices')
        .update({ 
          assigned_to: null,
          current_location: locationName,
          status: 'warehouse',
          updated_at: new Date().toISOString()
        })
        .in('id', devicesToReturn);

      if (error) throw error;

      // Log movements
      for (const deviceId of devicesToReturn) {
        const device = devices.find(d => d.id === deviceId);
        await logMovement({
          device_id: deviceId,
          movement_type: 'return',
          from_status: device?.status || 'issued',
          to_status: 'warehouse',
          from_engineer: device?.assigned_to,
          to_location: locationName,
          reason: 'Stock return',
          notes: `Returned to ${locationName}`,
        });
      }

      alert(`${devicesToReturn.length} device(s) returned`);
      setShowReturnModal(false);
      setSelectedDevices([]);
      setSelectedDevice(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Mark device as faulty
  const handleMarkFaulty = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      
      const { error } = await supabase
        .from('devices')
        .update({ status: 'faulty', updated_at: new Date().toISOString() })
        .eq('id', deviceId);

      if (error) throw error;

      await logMovement({
        device_id: deviceId,
        movement_type: 'status_change',
        from_status: device?.status || 'unknown',
        to_status: 'faulty',
        reason: 'Marked as faulty',
        notes: 'Device marked faulty by admin',
      });

      alert('Device marked as faulty');
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Import stock from CSV
  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 1; i < Math.min(lines.length, 501); i++) { // Limit to 500 records
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.trim().replace(/"/g, '') || '';
        });

        try {
          const deviceData = {
            serial_number: row['serial number'] || row['serial_number'] || row['sr no'] || `SN-${Date.now()}-${i}`,
            model: row['model'] || row['part number'] || row['part_number'] || 'Unknown',
            make: row['make'] || row['brand'] || 'Unknown',
            part_category: row['part category'] || row['category'] || row['part_category'] || 'POS Terminal',
            status: 'warehouse',
            current_location: row['location'] || row['fsp center'] || row['warehouse'] || 'Main Warehouse',
            device_bank: '44444444-4444-4444-4444-444444444444',
            notes: row['notes'] || row['remarks'] || '',
          };

          const { error } = await supabase.from('devices').insert(deviceData);
          
          if (error) {
            if (error.code === '23505') {
              // Duplicate serial number - skip
              errors.push(`Row ${i}: Duplicate serial number`);
            } else {
              failed++;
              errors.push(`Row ${i}: ${error.message}`);
            }
          } else {
            success++;
          }
        } catch (err: any) {
          failed++;
          errors.push(`Row ${i}: ${err.message}`);
        }
      }

      setImportResult({ success, failed, errors });
      if (success > 0) {
        loadData();
      }
    } catch (error: any) {
      setImportResult({ success: 0, failed: 1, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  // Log movement helper
  const logMovement = async (movement: Partial<StockMovement>) => {
    try {
      await supabase.from('stock_movements').insert({
        ...movement,
        actor_id: profile?.id || 'system',
        quantity: 1,
        metadata: {},
      });
    } catch (error) {
      console.error('Error logging movement:', error);
    }
  };

  const statusColors: Record<string, string> = {
    warehouse: 'bg-gray-100 text-gray-800',
    issued: 'bg-blue-100 text-blue-800',
    installed: 'bg-green-100 text-green-800',
    faulty: 'bg-red-100 text-red-800',
    returned: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-purple-100 text-purple-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-responsive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-1-responsive text-gray-900">Stock Management</h1>
          <p className="text-gray-500 mt-1">
            {stats.total} total devices • {filteredDevices.length} shown • {selectedDevices.length} selected
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAddStockModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-5 w-5" />
            Add Stock
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 btn-primary-responsive"
          >
            <Upload className="h-5 w-5" />
            Import CSV
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Package className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="heading-2-responsive">{stats.byStatus['warehouse'] || 0}</p>
              <p className="text-sm text-gray-500">In Warehouse</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="heading-2-responsive">{stats.byStatus['issued'] || 0}</p>
              <p className="text-sm text-gray-500">Issued</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="heading-2-responsive">{stats.byStatus['installed'] || 0}</p>
              <p className="text-sm text-gray-500">Installed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="heading-2-responsive">{stats.byStatus['in_transit'] || 0}</p>
              <p className="text-sm text-gray-500">In Transit</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="heading-2-responsive">{stats.byStatus['faulty'] || 0}</p>
              <p className="text-sm text-gray-500">Faulty</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Recent Movements
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by serial number, model, make..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Quick Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="issued">Issued</option>
                  <option value="installed">Installed</option>
                  <option value="in_transit">In Transit</option>
                  <option value="faulty">Faulty</option>
                </select>

                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={filters.engineer}
                  onChange={(e) => setFilters(prev => ({ ...prev, engineer: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Engineers</option>
                  <option value="">Unassigned</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedDevices.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
              <span className="text-blue-800 font-medium">
                {selectedDevices.length} device(s) selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Users className="h-4 w-4" />
                  Issue to Engineer
                </button>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Transfer
                </button>
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return
                </button>
                <button
                  onClick={() => setSelectedDevices([])}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Devices Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="table-responsive-wrapper custom-scrollbar">
        <table className="table-responsive">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-td-responsive text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="table-th-responsive">Serial #</th>
                    <th className="table-th-responsive">Model</th>
                    <th className="table-th-responsive">Category</th>
                    <th className="table-th-responsive">Status</th>
                    <th className="table-th-responsive">Location</th>
                    <th className="table-th-responsive">Assigned To</th>
                    <th className="table-th-responsive">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDevices.slice(0, 100).map((device) => (
                    <tr key={device.id} className={selectedDevices.includes(device.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="table-td-responsive">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => handleSelectDevice(device.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="table-td-responsive text-sm font-medium text-gray-900">
                        {device.serial_number}
                      </td>
                      <td className="table-td-responsive text-sm text-gray-600">
                        <div>{device.model}</div>
                        {device.make && <div className="text-xs text-gray-400">{device.make}</div>}
                      </td>
                      <td className="table-td-responsive text-sm text-gray-600">
                        {device.part_category || '-'}
                      </td>
                      <td className="table-td-responsive">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[device.status] || 'bg-gray-100'}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="table-td-responsive text-sm text-gray-600">
                        {device.current_location || '-'}
                      </td>
                      <td className="table-td-responsive text-sm">
                        {device.user_profiles ? (
                          <div className="text-gray-900">{device.user_profiles.full_name}</div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="table-td-responsive">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowIssueModal(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Issue"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowTransferModal(true);
                            }}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="Transfer"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMarkFaulty(device.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Mark Faulty"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDevices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No devices found</p>
              </div>
            )}

            {filteredDevices.length > 100 && (
              <div className="text-center py-4 bg-gray-50 text-gray-500 text-sm">
                Showing 100 of {filteredDevices.length} devices. Use filters to narrow down.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="table-responsive-wrapper custom-scrollbar">
        <table className="table-responsive">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th-responsive">Date</th>
                  <th className="table-th-responsive">Type</th>
                  <th className="table-th-responsive">From</th>
                  <th className="table-th-responsive">To</th>
                  <th className="table-th-responsive">Reason</th>
                  <th className="table-th-responsive">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="table-td-responsive text-sm text-gray-600">
                      {new Date(mov.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-td-responsive">
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="table-td-responsive text-sm text-gray-600">
                      {mov.from_location || mov.from_status || '-'}
                    </td>
                    <td className="table-td-responsive text-sm text-gray-600">
                      {mov.to_location || mov.to_status || '-'}
                    </td>
                    <td className="table-td-responsive text-sm text-gray-600">
                      {mov.reason}
                    </td>
                    <td className="table-td-responsive text-sm text-gray-500 max-w-xs truncate">
                      {mov.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="modal-backdrop">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="heading-3-responsive mb-4">Add New Stock</h2>
            
            <div className="space-y-4">
              <div>
                <label className="form-label-responsive">Serial Number *</label>
                <input
                  type="text"
                  value={newStock.serial_number}
                  onChange={(e) => setNewStock(prev => ({ ...prev, serial_number: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="form-label-responsive">Model *</label>
                <input
                  type="text"
                  value={newStock.model}
                  onChange={(e) => setNewStock(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Ingenico iWL250"
                />
              </div>
              <div>
                <label className="form-label-responsive">Make/Brand</label>
                <input
                  type="text"
                  value={newStock.make}
                  onChange={(e) => setNewStock(prev => ({ ...prev, make: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Ingenico"
                />
              </div>
              <div>
                <label className="form-label-responsive">Category</label>
                <select
                  value={newStock.part_category}
                  onChange={(e) => setNewStock(prev => ({ ...prev, part_category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="POS Terminal">POS Terminal</option>
                  <option value="Battery">Battery</option>
                  <option value="Adaptor">Adaptor</option>
                  <option value="Printer">Printer</option>
                  <option value="Cable">Cable</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label-responsive">Warehouse *</label>
                <select
                  value={newStock.warehouse_id}
                  onChange={(e) => setNewStock(prev => ({ ...prev, warehouse_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddStockModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStock}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="modal-backdrop">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="heading-3-responsive mb-4">Issue Stock to Engineer</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {engineers.map(eng => (
                <button
                  key={eng.id}
                  onClick={() => handleIssue(eng.id)}
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{eng.full_name}</p>
                    {eng.phone && <p className="text-sm text-gray-500">{eng.phone}</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setSelectedDevice(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-backdrop">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="heading-3-responsive mb-4">Transfer Stock to Location</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {warehouses.map(wh => (
                <button
                  key={wh.id}
                  onClick={() => handleTransfer(wh.id)}
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-purple-50 hover:border-purple-300 text-left"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Warehouse className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{wh.name}</p>
                    {wh.address && <p className="text-sm text-gray-500">{wh.address}</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedDevice(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="modal-backdrop">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="heading-3-responsive mb-4">Return Stock to Warehouse</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {warehouses.map(wh => (
                <button
                  key={wh.id}
                  onClick={() => handleReturn(wh.id)}
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 hover:border-green-300 text-left"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Warehouse className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{wh.name}</p>
                    {wh.address && <p className="text-sm text-gray-500">{wh.address}</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedDevice(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="heading-3-responsive mb-4">Import Stock from CSV</h2>
            
            <div className="space-y-4">
              <div>
                <label className="form-label-responsive">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected columns: Serial Number, Model, Make, Part Category, Location
                </p>
              </div>

              {importResult && (
                <div className={`p-3 rounded-lg ${importResult.failed > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                  <p className="font-medium">
                    ✓ {importResult.success} imported, ✗ {importResult.failed} failed
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="btn-primary-responsive disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
