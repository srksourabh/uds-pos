import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Smartphone, Upload, UserPlus, CheckSquare, Download, Package } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { BulkImportModal } from '../components/BulkImportModal';
import { IssueDeviceModal } from '../components/IssueDeviceModal';
import { AddDeviceModal } from '../components/AddDeviceModal';

type Device = Database['public']['Tables']['devices']['Row'] & {
  bank_name?: string;
  assigned_name?: string;
  customer_name?: string;
};

type WhereaboutsFilter = 'all' | 'warehouse' | 'intransit' | 'engineer' | 'installed';
type ConditionFilter = 'all' | 'good' | 'faulty' | 'returned';

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [whereaboutsFilter, setWhereaboutsFilter] = useState<WhereaboutsFilter>('all');
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [engineerMap, setEngineerMap] = useState<Map<string, string>>(new Map());
  const [bankMap, setBankMap] = useState<Map<string, string>>(new Map());
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadDevices();

    const channel = supabase
      .channel('devices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadDevices)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Load lookup data first
      const [engineersRes, banksRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name').eq('role', 'engineer'),
        supabase.from('banks').select('id, name')
      ]);

      const engMap = new Map<string, string>();
      (engineersRes.data || []).forEach(eng => {
        engMap.set(eng.id, eng.full_name || 'Unknown');
      });
      setEngineerMap(engMap);

      const bnkMap = new Map<string, string>();
      const customerList: { id: string; name: string }[] = [];
      (banksRes.data || []).forEach(bank => {
        bnkMap.set(bank.id, bank.name || 'Unknown');
        customerList.push({ id: bank.id, name: bank.name || 'Unknown' });
      });
      setBankMap(bnkMap);
      setCustomers(customerList);

      // Load devices with simple query (no FK joins to avoid 400 errors)
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with lookup data
      const enrichedDevices = (data || []).map(device => ({
        ...device,
        bank_name: device.device_bank ? bnkMap.get(device.device_bank) : undefined,
        assigned_name: device.assigned_to ? engMap.get(device.assigned_to) : undefined,
        customer_name: device.customer_id ? bnkMap.get(device.customer_id) : (device.device_bank ? bnkMap.get(device.device_bank) : undefined),
      }));

      setDevices(enrichedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map old status to whereabouts
  const getWhereabouts = (device: Device): string => {
    if (device.whereabouts) return device.whereabouts;
    // Fallback mapping from old status
    switch (device.status) {
      case 'warehouse': return 'warehouse';
      case 'issued': return 'engineer';
      case 'installed': return 'installed';
      case 'in_transit': return 'intransit';
      default: return 'warehouse';
    }
  };

  // Map old status to condition
  const getCondition = (device: Device): string => {
    if (device.condition_status) return device.condition_status;
    // Fallback mapping
    switch (device.status) {
      case 'faulty': return 'faulty';
      case 'returned': return 'returned';
      default: return 'good';
    }
  };

  const filteredDevices = devices.filter((device) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (device.serial_number || '').toLowerCase().includes(searchLower) ||
      (device.model || '').toLowerCase().includes(searchLower) ||
      (device.make || '').toLowerCase().includes(searchLower) ||
      (device.unique_entry_id || '').toLowerCase().includes(searchLower) ||
      (device.tid || '').toLowerCase().includes(searchLower);
    
    const deviceWhereabouts = getWhereabouts(device);
    const matchesWhereabouts = whereaboutsFilter === 'all' || deviceWhereabouts === whereaboutsFilter;
    
    const deviceCondition = getCondition(device);
    const matchesCondition = conditionFilter === 'all' || deviceCondition === conditionFilter;
    
    const matchesCustomer = customerFilter === 'all' || 
      device.customer_id === customerFilter || 
      device.device_bank === customerFilter;
    
    return matchesSearch && matchesWhereabouts && matchesCondition && matchesCustomer;
  });

  const whereaboutsColors: Record<string, string> = {
    warehouse: 'bg-gray-100 text-gray-800',
    intransit: 'bg-purple-100 text-purple-800',
    engineer: 'bg-yellow-100 text-yellow-800',
    installed: 'bg-green-100 text-green-800',
  };

  const conditionColors: Record<string, string> = {
    good: 'bg-green-100 text-green-800',
    faulty: 'bg-red-100 text-red-800',
    returned: 'bg-blue-100 text-blue-800',
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelection = new Set(selectedDevices);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    setSelectedDevices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDevices.size === filteredDevices.length && filteredDevices.length > 0) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const getSelectedDeviceObjects = () => {
    return devices.filter(d => selectedDevices.has(d.id));
  };

  const handleIssueDevices = () => {
    const selected = getSelectedDeviceObjects();
    const warehouseDevices = selected.filter(d => {
      const whereabouts = getWhereabouts(d);
      return whereabouts === 'warehouse';
    });
    if (warehouseDevices.length === 0) {
      alert('Please select devices in warehouse to issue');
      return;
    }
    setShowIssueModal(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Unique Entry ID',
      'Serial Number',
      'TID',
      'Model',
      'Make',
      'Device Category',
      'Customer',
      'Bank',
      'Whereabouts',
      'Condition',
      'Assigned To',
      'Installed At',
      'Receiving Date',
      'Created At'
    ];

    const rows = filteredDevices.map(device => [
      device.unique_entry_id || '',
      device.serial_number || '',
      device.tid || '',
      device.model || '',
      device.make || '',
      device.device_category || '',
      device.customer_name || '',
      device.bank_name || '',
      getWhereabouts(device),
      getCondition(device),
      device.assigned_name || '',
      device.installed_at_client || '',
      device.receiving_date || '',
      device.created_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `devices_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Count devices by whereabouts for tabs
  const whereaboutsCounts = {
    all: devices.length,
    warehouse: devices.filter(d => getWhereabouts(d) === 'warehouse').length,
    intransit: devices.filter(d => getWhereabouts(d) === 'intransit').length,
    engineer: devices.filter(d => getWhereabouts(d) === 'engineer').length,
    installed: devices.filter(d => getWhereabouts(d) === 'installed').length,
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
      <div className="mb-responsive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-1-responsive text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-2">Manage POS devices and inventory</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </button>
        </div>
      </div>

      {/* Whereabouts Tabs */}
      <div className="mb-4 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 min-w-max" aria-label="Tabs">
          {[
            { key: 'all', label: 'All' },
            { key: 'warehouse', label: 'Warehouse' },
            { key: 'intransit', label: 'In Transit' },
            { key: 'engineer', label: 'With Engineer' },
            { key: 'installed', label: 'Installed' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setWhereaboutsFilter(tab.key as WhereaboutsFilter)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
                whereaboutsFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                whereaboutsFilter === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {whereaboutsCounts[tab.key as keyof typeof whereaboutsCounts]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {selectedDevices.size > 0 && (
        <div className="mb-responsive bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedDevices.size} device{selectedDevices.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleIssueDevices}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Issue to Engineer
              </button>
              <button
                onClick={() => setSelectedDevices(new Set())}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-responsive mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by serial number, TID, model, make, entry ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400 w-4 h-4" />
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value as ConditionFilter)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="all">All Conditions</option>
                <option value="good">Good</option>
                <option value="faulty">Faulty</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="all">All Customers</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedDevices.size === filteredDevices.length && filteredDevices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Entry ID / Serial
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  TID / Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Whereabouts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assigned To
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No devices found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => {
                  const whereabouts = getWhereabouts(device);
                  const condition = getCondition(device);
                  return (
                    <tr key={device.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDevices.has(device.id)}
                          onChange={() => toggleDeviceSelection(device.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Smartphone className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div>
                            {device.unique_entry_id && (
                              <span className="text-xs text-blue-600 font-mono block">{device.unique_entry_id}</span>
                            )}
                            <span className="font-medium text-gray-900 text-sm">{device.serial_number || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {device.tid && (
                            <span className="text-xs text-purple-600 font-mono block">{device.tid}</span>
                          )}
                          <span className="text-sm text-gray-600">{device.model || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{device.customer_name || device.bank_name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${whereaboutsColors[whereabouts] || 'bg-gray-100 text-gray-800'}`}>
                          {whereabouts === 'intransit' ? 'In Transit' : whereabouts.charAt(0).toUpperCase() + whereabouts.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${conditionColors[condition] || 'bg-gray-100 text-gray-800'}`}>
                          {condition.charAt(0).toUpperCase() + condition.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {device.assigned_name || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredDevices.length} of {devices.length} devices
        </p>
      </div>

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          loadDevices();
          setShowBulkImport(false);
        }}
      />

      <IssueDeviceModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        selectedDevices={getSelectedDeviceObjects().filter(d => getWhereabouts(d) === 'warehouse')}
        onSuccess={() => {
          loadDevices();
          setSelectedDevices(new Set());
          setShowIssueModal(false);
        }}
      />

      <AddDeviceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadDevices();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
