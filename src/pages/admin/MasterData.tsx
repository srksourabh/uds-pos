import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Users, Cpu, MapPin, Plus, Upload, Download, 
  Search, ChevronDown, Check, X, AlertCircle, FileSpreadsheet,
  RefreshCw, Trash2, Edit, Eye, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TabType = 'warehouse' | 'employee' | 'device' | 'pincode';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  manager_name: string | null;
  contact_email: string | null;
  manager_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  office_type: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  emp_id: string | null;
  full_name: string;
  designation: string | null;
  employee_type: string | null;
  email: string;
  phone: string | null;
  home_address: string | null;
  home_pincode: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  date_of_joining: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  role: string;
  active: boolean;
}

interface Device {
  id: string;
  identification_number: string | null;
  customer_id: string | null;
  part_category: string | null;
  model: string | null;
  serial_number: string | null;
  receiving_date: string | null;
  status: string;
  make: string | null;
}

interface PincodeEntry {
  id: string;
  pincode: string;
  city: string;
  state: string;
  region: string;
  sla_hours: number;
  is_serviceable: boolean;
}

interface Customer {
  id: string;
  name: string;
  short_name: string | null;
}

export function MasterData() {
  const [activeTab, setActiveTab] = useState<TabType>('warehouse');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Data states
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [pincodes, setPincodes] = useState<PincodeEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search/filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // CSV upload states
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Warehouse form
  const [warehouseForm, setWarehouseForm] = useState({
    name: '', code: '', manager_name: '', contact_email: '', 
    manager_phone: '', address: '', city: '', state: '', pincode: '', office_type: 'warehouse'
  });

  // Employee form
  const [employeeForm, setEmployeeForm] = useState({
    emp_id: '', full_name: '', designation: '', employee_type: 'permanent',
    email: '', phone: '', home_address: '', home_pincode: '',
    last_location_lat: '', last_location_lng: '', date_of_joining: '',
    emergency_contact_name: '', emergency_contact_phone: '', role: 'engineer'
  });

  // Device form
  const [deviceForm, setDeviceForm] = useState({
    customer_id: '', part_category: '', model: '', serial_number: '', receiving_date: '', make: ''
  });

  // Pincode form
  const [pincodeForm, setPincodeForm] = useState({
    pincode: '', city: '', state: '', region: '', sla_hours: 48, is_serviceable: true
  });

  const tabs = [
    { id: 'warehouse' as TabType, label: 'Warehouse', icon: Building2, color: 'blue' },
    { id: 'employee' as TabType, label: 'Employee', icon: Users, color: 'green' },
    { id: 'device' as TabType, label: 'Device Inventory', icon: Cpu, color: 'purple' },
    { id: 'pincode' as TabType, label: 'Pincode Master', icon: MapPin, color: 'orange' },
  ];

  useEffect(() => {
    loadData();
    loadCustomers();
  }, [activeTab]);

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, short_name').order('name');
    if (data) setCustomers(data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'warehouse': {
          const { data: wh } = await supabase.from('warehouses').select('*').order('name');
          if (wh) setWarehouses(wh);
          break;
        }
        case 'employee': {
          const { data: emp } = await supabase.from('user_profiles').select('*').order('full_name');
          if (emp) setEmployees(emp);
          break;
        }
        case 'device': {
          const { data: dev } = await supabase.from('devices').select('*').order('created_at', { ascending: false }).limit(500);
          if (dev) setDevices(dev);
          break;
        }
        case 'pincode': {
          const { data: pin } = await supabase.from('pincode_master').select('*').order('pincode');
          if (pin) setPincodes(pin);
          break;
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  // Generate unique 12-digit alphanumeric ID
  const generateDeviceId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Triple-Match validation for devices
  const validateTripleMatch = async (customer_id: string, serial_number: string, model: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('devices')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('serial_number', serial_number)
      .eq('model', model);
    
    if (error) {
      console.error('Triple-match validation error:', error);
      return false;
    }
    
    return !data || data.length === 0;
  };

  // Auto-populate SLA/Region based on pincode
  const autopopulatePincodeData = async (pincode: string) => {
    if (pincode.length !== 6) return;
    
    const { data } = await supabase
      .from('pincode_master')
      .select('region, sla_hours, city, state')
      .eq('pincode', pincode)
      .single();
    
    if (data) {
      setPincodeForm(prev => ({
        ...prev,
        region: data.region || prev.region,
        sla_hours: data.sla_hours || prev.sla_hours,
        city: data.city || prev.city,
        state: data.state || prev.state
      }));
    }
  };

  // Handle form submissions
  const handleWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await supabase.from('warehouses').update(warehouseForm).eq('id', editingItem.id);
        setMessage({ type: 'success', text: 'Warehouse updated successfully' });
      } else {
        await supabase.from('warehouses').insert(warehouseForm);
        setMessage({ type: 'success', text: 'Warehouse created successfully' });
      }
      resetForm();
      loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = {
        ...employeeForm,
        last_location_lat: employeeForm.last_location_lat ? parseFloat(employeeForm.last_location_lat) : null,
        last_location_lng: employeeForm.last_location_lng ? parseFloat(employeeForm.last_location_lng) : null,
      };
      
      if (editingItem) {
        await supabase.from('user_profiles').update(formData).eq('id', editingItem.id);
        setMessage({ type: 'success', text: 'Employee updated successfully' });
      } else {
        // For new employees, we need to create auth user first
        setMessage({ type: 'error', text: 'New employee creation requires admin setup. Use User Management for new users.' });
      }
      resetForm();
      loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Triple-Match validation
      if (!editingItem) {
        const isValid = await validateTripleMatch(
          deviceForm.customer_id, 
          deviceForm.serial_number, 
          deviceForm.model
        );
        if (!isValid) {
          setMessage({ type: 'error', text: 'Duplicate device found! Customer + Serial + Model combination already exists.' });
          setLoading(false);
          return;
        }
      }

      const formData = {
        ...deviceForm,
        identification_number: editingItem?.identification_number || generateDeviceId(),
        status: 'warehouse'
      };
      
      if (editingItem) {
        await supabase.from('devices').update(formData).eq('id', editingItem.id);
        setMessage({ type: 'success', text: 'Device updated successfully' });
      } else {
        await supabase.from('devices').insert(formData);
        setMessage({ type: 'success', text: `Device created with ID: ${formData.identification_number}` });
      }
      resetForm();
      loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const handlePincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await supabase.from('pincode_master').update(pincodeForm).eq('id', editingItem.id);
        setMessage({ type: 'success', text: 'Pincode updated successfully' });
      } else {
        await supabase.from('pincode_master').insert(pincodeForm);
        setMessage({ type: 'success', text: 'Pincode created successfully' });
      }
      resetForm();
      loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setWarehouseForm({ name: '', code: '', manager_name: '', contact_email: '', manager_phone: '', address: '', city: '', state: '', pincode: '', office_type: 'warehouse' });
    setEmployeeForm({ emp_id: '', full_name: '', designation: '', employee_type: 'permanent', email: '', phone: '', home_address: '', home_pincode: '', last_location_lat: '', last_location_lng: '', date_of_joining: '', emergency_contact_name: '', emergency_contact_phone: '', role: 'engineer' });
    setDeviceForm({ customer_id: '', part_category: '', model: '', serial_number: '', receiving_date: '', make: '' });
    setPincodeForm({ pincode: '', city: '', state: '', region: '', sla_hours: 48, is_serviceable: true });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
    switch (activeTab) {
      case 'warehouse':
        setWarehouseForm({
          name: item.name || '',
          code: item.code || '',
          manager_name: item.manager_name || '',
          contact_email: item.contact_email || '',
          manager_phone: item.manager_phone || '',
          address: item.address || '',
          city: item.city || '',
          state: item.state || '',
          pincode: item.pincode || '',
          office_type: item.office_type || 'warehouse'
        });
        break;
      case 'employee':
        setEmployeeForm({
          emp_id: item.emp_id || '',
          full_name: item.full_name || '',
          designation: item.designation || '',
          employee_type: item.employee_type || 'permanent',
          email: item.email || '',
          phone: item.phone || '',
          home_address: item.home_address || '',
          home_pincode: item.home_pincode || '',
          last_location_lat: item.last_location_lat?.toString() || '',
          last_location_lng: item.last_location_lng?.toString() || '',
          date_of_joining: item.date_of_joining || '',
          emergency_contact_name: item.emergency_contact_name || '',
          emergency_contact_phone: item.emergency_contact_phone || '',
          role: item.role || 'engineer'
        });
        break;
      case 'device':
        setDeviceForm({
          customer_id: item.customer_id || '',
          part_category: item.part_category || '',
          model: item.model || '',
          serial_number: item.serial_number || '',
          receiving_date: item.receiving_date || '',
          make: item.make || ''
        });
        break;
      case 'pincode':
        setPincodeForm({
          pincode: item.pincode || '',
          city: item.city || '',
          state: item.state || '',
          region: item.region || '',
          sla_hours: item.sla_hours || 48,
          is_serviceable: item.is_serviceable ?? true
        });
        break;
    }
  };

  // CSV Upload Handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setMessage({ type: 'error', text: 'CSV file is empty or has no data rows' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || '';
        });
        return row;
      });

      setCsvHeaders(headers);
      setCsvData(data);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const processCsvImport = async () => {
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of csvData) {
        try {
          switch (activeTab) {
            case 'warehouse': {
              await supabase.from('warehouses').insert({
                name: row.name || row.Name,
                code: row.code || row.Code || row.ID,
                manager_name: row.manager_name || row['Contact Person'] || row['Manager Name'],
                contact_email: row.contact_email || row.Email,
                manager_phone: row.manager_phone || row.Phone,
                address: row.address || row.Address,
              });
              break;
            }
            case 'employee':
              // Skip - requires auth user creation
              break;
            case 'device': {
              const deviceId = generateDeviceId();
              const isValid = await validateTripleMatch(
                row.customer_id || row.Customer,
                row.serial_number || row.Serial || row['Serial Number'],
                row.model || row.Model
              );
              if (isValid) {
                await supabase.from('devices').insert({
                  identification_number: deviceId,
                  customer_id: row.customer_id || null,
                  part_category: row.part_category || row.Category,
                  model: row.model || row.Model,
                  serial_number: row.serial_number || row.Serial || row['Serial Number'],
                  receiving_date: row.receiving_date || row['Receiving Date'] || new Date().toISOString().split('T')[0],
                  make: row.make || row.Make,
                  status: 'warehouse'
                });
              }
              break;
            }
            case 'pincode': {
              await supabase.from('pincode_master').insert({
                pincode: row.pincode || row.Pincode || row['Pin Code'],
                city: row.city || row.City,
                state: row.state || row.State,
                region: row.region || row.Region,
                sla_hours: parseInt(row.sla_hours || row['SLA Hours'] || '48'),
              });
              break;
            }
          }
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      
      setMessage({ type: 'success', text: `Import complete: ${successCount} success, ${errorCount} errors` });
      setShowCsvPreview(false);
      setCsvData([]);
      loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setLoading(false);
  };

  const downloadTemplate = () => {
    let headers: string[] = [];
    switch (activeTab) {
      case 'warehouse':
        headers = ['name', 'code', 'manager_name', 'contact_email', 'manager_phone', 'address'];
        break;
      case 'employee':
        headers = ['emp_id', 'full_name', 'designation', 'employee_type', 'email', 'phone', 'home_address', 'home_pincode', 'date_of_joining', 'emergency_contact_name', 'emergency_contact_phone'];
        break;
      case 'device':
        headers = ['customer_id', 'part_category', 'model', 'serial_number', 'receiving_date', 'make'];
        break;
      case 'pincode':
        headers = ['pincode', 'city', 'state', 'region', 'sla_hours'];
        break;
    }
    
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    a.click();
  };

  // Filter data based on search
  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'warehouse':
        return warehouses.filter(w => 
          w.name?.toLowerCase().includes(term) || 
          w.code?.toLowerCase().includes(term) ||
          w.city?.toLowerCase().includes(term)
        );
      case 'employee':
        return employees.filter(e => 
          e.full_name?.toLowerCase().includes(term) || 
          e.emp_id?.toLowerCase().includes(term) ||
          e.email?.toLowerCase().includes(term)
        );
      case 'device':
        return devices.filter(d => 
          d.serial_number?.toLowerCase().includes(term) || 
          d.model?.toLowerCase().includes(term) ||
          d.identification_number?.toLowerCase().includes(term)
        );
      case 'pincode':
        return pincodes.filter(p => 
          p.pincode?.toLowerCase().includes(term) || 
          p.city?.toLowerCase().includes(term) ||
          p.region?.toLowerCase().includes(term)
        );
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Data Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage warehouses, employees, devices, and pincodes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mx-4 sm:mx-6 mt-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowForm(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? `bg-${tab.color}-600 text-white`
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split View Container */}
      <div className="px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                {editingItem ? 'Edit' : 'Add New'} {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              )}
            </div>

            {showForm ? (
              <div>
                {/* Warehouse Form */}
                {activeTab === 'warehouse' && (
                  <form onSubmit={handleWarehouseSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={warehouseForm.name}
                          onChange={e => setWarehouseForm({...warehouseForm, name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code/ID *</label>
                        <input
                          type="text"
                          value={warehouseForm.code}
                          onChange={e => setWarehouseForm({...warehouseForm, code: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={warehouseForm.manager_name}
                          onChange={e => setWarehouseForm({...warehouseForm, manager_name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={warehouseForm.contact_email}
                          onChange={e => setWarehouseForm({...warehouseForm, contact_email: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={warehouseForm.manager_phone}
                          onChange={e => setWarehouseForm({...warehouseForm, manager_phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Office Type</label>
                        <select
                          value={warehouseForm.office_type}
                          onChange={e => setWarehouseForm({...warehouseForm, office_type: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="warehouse">Warehouse</option>
                          <option value="head_office">Head Office</option>
                          <option value="regional_office">Regional Office</option>
                          <option value="service_center">Service Center</option>
                          <option value="hub">Hub</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={warehouseForm.address}
                        onChange={e => setWarehouseForm({...warehouseForm, address: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Employee Form */}
                {activeTab === 'employee' && (
                  <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                        <input
                          type="text"
                          value={employeeForm.emp_id}
                          onChange={e => setEmployeeForm({...employeeForm, emp_id: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="UDSPL####"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={employeeForm.full_name}
                          onChange={e => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={employeeForm.designation}
                          onChange={e => setEmployeeForm({...employeeForm, designation: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={employeeForm.employee_type}
                          onChange={e => setEmployeeForm({...employeeForm, employee_type: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="permanent">Permanent</option>
                          <option value="contractual">Contractual</option>
                          <option value="temporary">Temporary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={employeeForm.email}
                          onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={employeeForm.phone}
                          onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                        <input
                          type="date"
                          value={employeeForm.date_of_joining}
                          onChange={e => setEmployeeForm({...employeeForm, date_of_joining: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={employeeForm.role}
                          onChange={e => setEmployeeForm({...employeeForm, role: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="engineer">Engineer</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          value={employeeForm.home_address}
                          onChange={e => setEmployeeForm({...employeeForm, home_address: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                        <input
                          type="text"
                          value={employeeForm.home_pincode}
                          onChange={e => setEmployeeForm({...employeeForm, home_pincode: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          maxLength={6}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={employeeForm.last_location_lat}
                            onChange={e => setEmployeeForm({...employeeForm, last_location_lat: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={employeeForm.last_location_lng}
                            onChange={e => setEmployeeForm({...employeeForm, last_location_lng: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                        <input
                          type="text"
                          value={employeeForm.emergency_contact_name}
                          onChange={e => setEmployeeForm({...employeeForm, emergency_contact_name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                        <input
                          type="tel"
                          value={employeeForm.emergency_contact_phone}
                          onChange={e => setEmployeeForm({...employeeForm, emergency_contact_phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading || !editingItem} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {loading ? 'Saving...' : 'Update Employee'}
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                    {!editingItem && (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                        ⚠️ New employees must be created through User Management to set up authentication credentials.
                      </p>
                    )}
                  </form>
                )}

                {/* Device Form */}
                {activeTab === 'device' && (
                  <form onSubmit={handleDeviceSubmit} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Triple-Match Validation:</strong> Customer + Serial + Model combination must be unique.
                        A 12-digit alphanumeric ID will be auto-generated.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                        <select
                          value={deviceForm.customer_id}
                          onChange={e => setDeviceForm({...deviceForm, customer_id: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Customer</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={deviceForm.part_category}
                          onChange={e => setDeviceForm({...deviceForm, part_category: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Category</option>
                          <option value="POS Terminal">POS Terminal</option>
                          <option value="mPOS">mPOS</option>
                          <option value="Pin Pad">Pin Pad</option>
                          <option value="Printer">Printer</option>
                          <option value="Charger">Charger</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Make/Brand</label>
                        <select
                          value={deviceForm.make}
                          onChange={e => setDeviceForm({...deviceForm, make: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Make</option>
                          <option value="Ingenico">Ingenico</option>
                          <option value="VeriFone">VeriFone</option>
                          <option value="FUJIAN">FUJIAN</option>
                          <option value="PAX">PAX</option>
                          <option value="Newland">Newland</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                        <input
                          type="text"
                          value={deviceForm.model}
                          onChange={e => setDeviceForm({...deviceForm, model: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number *</label>
                        <input
                          type="text"
                          value={deviceForm.serial_number}
                          onChange={e => setDeviceForm({...deviceForm, serial_number: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Date</label>
                        <input
                          type="date"
                          value={deviceForm.receiving_date}
                          onChange={e => setDeviceForm({...deviceForm, receiving_date: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        {loading ? 'Saving...' : (editingItem ? 'Update Device' : 'Create Device')}
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Pincode Form */}
                {activeTab === 'pincode' && (
                  <form onSubmit={handlePincodeSubmit} className="space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-orange-800">
                        <strong>Auto-Populate:</strong> Enter pincode to auto-fill SLA hours and region from existing data.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                        <input
                          type="text"
                          value={pincodeForm.pincode}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setPincodeForm({...pincodeForm, pincode: val});
                            if (val.length === 6) autopopulatePincodeData(val);
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                          maxLength={6}
                          placeholder="6 digits"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SLA Hours *</label>
                        <input
                          type="number"
                          value={pincodeForm.sla_hours}
                          onChange={e => setPincodeForm({...pincodeForm, sla_hours: parseInt(e.target.value) || 48})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                        <input
                          type="text"
                          value={pincodeForm.region}
                          onChange={e => setPincodeForm({...pincodeForm, region: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                        <input
                          type="text"
                          value={pincodeForm.state}
                          onChange={e => setPincodeForm({...pincodeForm, state: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          value={pincodeForm.city}
                          onChange={e => setPincodeForm({...pincodeForm, city: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pincodeForm.is_serviceable}
                          onChange={e => setPincodeForm({...pincodeForm, is_serviceable: e.target.checked})}
                          className="w-4 h-4 text-blue-600"
                          id="is_serviceable"
                        />
                        <label htmlFor="is_serviceable" className="text-sm font-medium text-gray-700">
                          Is Serviceable
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                        {loading ? 'Saving...' : (editingItem ? 'Update Pincode' : 'Create Pincode')}
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              // CSV Upload Section
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Upload CSV file for bulk import</p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Choose File
                    </button>
                    <button
                      onClick={downloadTemplate}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Data Grid */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-sm text-gray-500">
                {getFilteredData().length} records
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  {activeTab === 'warehouse' && (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Manager</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                    </tr>
                  )}
                  {activeTab === 'employee' && (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Emp ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Designation</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                    </tr>
                  )}
                  {activeTab === 'device' && (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Serial</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                    </tr>
                  )}
                  {activeTab === 'pincode' && (
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Pincode</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">City</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Region</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">SLA</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : getFilteredData().length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    <>
                      {activeTab === 'warehouse' && (getFilteredData() as Warehouse[]).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.code}</td>
                          <td className="px-4 py-3 text-gray-600">{item.manager_name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {item.office_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeTab === 'employee' && (getFilteredData() as Employee[]).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.emp_id || '-'}</td>
                          <td className="px-4 py-3">{item.full_name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.designation || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              item.role === 'engineer' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeTab === 'device' && (getFilteredData() as Device[]).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{item.identification_number || '-'}</td>
                          <td className="px-4 py-3 font-medium">{item.serial_number || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{item.model || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.status === 'warehouse' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'issued' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'installed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeTab === 'pincode' && (getFilteredData() as PincodeEntry[]).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-medium">{item.pincode}</td>
                          <td className="px-4 py-3">{item.city}</td>
                          <td className="px-4 py-3 text-gray-600">{item.region}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                              {item.sla_hours}h
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Preview Modal */}
      {showCsvPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">CSV Preview</h3>
              <button onClick={() => setShowCsvPreview(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {csvData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {csvHeaders.map((h, j) => (
                        <td key={j} className="px-3 py-2 text-gray-800">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing 10 of {csvData.length} rows
                </p>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowCsvPreview(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={processCsvImport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : `Import ${csvData.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterData;
