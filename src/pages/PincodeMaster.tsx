/**
 * PincodeMaster.tsx
 * Phase 2, Step 1.1: Pincode Master Management Page
 * 
 * Purpose: Manage serviceable pincodes with SLA hours and regional assignments
 * Features:
 * - View all pincodes with filtering and search
 * - Add/Edit/Delete pincodes (admin only)
 * - Assign coordinators to pincodes
 * - Configure SLA hours per pincode
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PincodeMaster, PincodeMasterWithCoordinator, UserProfile, ServicePriority } from '../lib/database.types';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  AlertTriangle,
  RefreshCw,
  Upload,
  Download,
  FileText
} from 'lucide-react';

// Priority badge colors
const priorityColors: Record<ServicePriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  priority: 'bg-red-100 text-red-800'
};

// Indian states for dropdown
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
];

// Regions
const REGIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
  'Bhubaneswar', 'Guwahati', 'Hyderabad', 'Pune', 'Ahmedabad'
];

export default function PincodeMasterPage() {
  // State
  const [pincodes, setPincodes] = useState<PincodeMasterWithCoordinator[]>([]);
  const [coordinators, setCoordinators] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('');
  const [filterServiceable, setFilterServiceable] = useState<'all' | 'yes' | 'no'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPincode, setEditingPincode] = useState<PincodeMaster | null>(null);
  const [formData, setFormData] = useState({
    pin_code: '',
    area_name: '',
    city: '',
    district: '',
    state: '',
    region: '',
    sla_hours: 48,
    service_priority: 'normal' as ServicePriority,
    is_serviceable: true,
    primary_coordinator_id: ''
  });
  const [saving, setSaving] = useState(false);

  // CSV Upload state
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvUploading, setCSVUploading] = useState(false);
  const [csvResults, setCSVResults] = useState<{imported: number; errors: string[]} | null>(null);

  // User role check (for edit permissions)
  const [userRole, setUserRole] = useState<string>('');
  const isAdmin = ['super_admin', 'admin', 'senior_manager'].includes(userRole);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data) setUserRole(data.role);
      }
    };
    fetchUserRole();
  }, []);

  // Fetch pincodes
  const fetchPincodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pincode_master')
        .select(`
          *,
          coordinator:primary_coordinator_id (
            id,
            full_name,
            phone,
            email
          )
        `)
        .order('pin_code');

      if (fetchError) throw fetchError;
      setPincodes(data || []);

    } catch (err) {
      console.error('Error fetching pincodes:', err);
      setError('Failed to load pincodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch coordinators for dropdown
  const fetchCoordinators = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, role')
        .in('role', ['coordinator', 'manager', 'senior_manager', 'admin', 'super_admin'])
        .eq('status', 'active')
        .order('full_name');

      if (fetchError) throw fetchError;
      setCoordinators(data || []);

    } catch (err) {
      console.error('Error fetching coordinators:', err);
    }
  };

  useEffect(() => {
    fetchPincodes();
    fetchCoordinators();
  }, []);

  // Filtered pincodes
  const filteredPincodes = useMemo(() => {
    return pincodes.filter(pincode => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !pincode.pin_code.includes(query) &&
          !pincode.city.toLowerCase().includes(query) &&
          !(pincode.area_name?.toLowerCase().includes(query)) &&
          !pincode.region.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Region filter
      if (filterRegion && pincode.region !== filterRegion) {
        return false;
      }

      // State filter
      if (filterState && pincode.state !== filterState) {
        return false;
      }

      // Serviceable filter
      if (filterServiceable === 'yes' && !pincode.is_serviceable) {
        return false;
      }
      if (filterServiceable === 'no' && pincode.is_serviceable) {
        return false;
      }

      return true;
    });
  }, [pincodes, searchQuery, filterRegion, filterState, filterServiceable]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: pincodes.length,
      serviceable: pincodes.filter(p => p.is_serviceable).length,
      nonServiceable: pincodes.filter(p => !p.is_serviceable).length,
      withCoordinator: pincodes.filter(p => p.primary_coordinator_id).length,
      uniqueRegions: [...new Set(pincodes.map(p => p.region))].length
    };
  }, [pincodes]);

  // Open modal for add/edit
  const openModal = (pincode?: PincodeMaster) => {
    if (pincode) {
      setEditingPincode(pincode);
      setFormData({
        pin_code: pincode.pin_code,
        area_name: pincode.area_name || '',
        city: pincode.city,
        district: pincode.district || '',
        state: pincode.state,
        region: pincode.region,
        sla_hours: pincode.sla_hours,
        service_priority: pincode.service_priority,
        is_serviceable: pincode.is_serviceable,
        primary_coordinator_id: pincode.primary_coordinator_id || ''
      });
    } else {
      setEditingPincode(null);
      setFormData({
        pin_code: '',
        area_name: '',
        city: '',
        district: '',
        state: '',
        region: '',
        sla_hours: 48,
        service_priority: 'normal',
        is_serviceable: true,
        primary_coordinator_id: ''
      });
    }
    setShowModal(true);
  };

  // Save pincode
  const handleSave = async () => {
    if (!formData.pin_code || !formData.city || !formData.state || !formData.region) {
      alert('Please fill in all required fields');
      return;
    }

    if (!/^\d{6}$/.test(formData.pin_code)) {
      alert('Pincode must be exactly 6 digits');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        pin_code: formData.pin_code,
        area_name: formData.area_name || null,
        city: formData.city,
        district: formData.district || null,
        state: formData.state,
        region: formData.region,
        sla_hours: formData.sla_hours,
        service_priority: formData.service_priority,
        is_serviceable: formData.is_serviceable,
        primary_coordinator_id: formData.primary_coordinator_id || null,
        updated_by: user?.id
      };

      if (editingPincode) {
        // Update
        const { error: updateError } = await supabase
          .from('pincode_master')
          .update(payload)
          .eq('id', editingPincode.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('pincode_master')
          .insert({
            ...payload,
            created_by: user?.id
          });

        if (insertError) throw insertError;
      }

      setShowModal(false);
      fetchPincodes();

    } catch (err: any) {
      console.error('Error saving pincode:', err);
      if (err.code === '23505') {
        alert('This pincode already exists');
      } else {
        alert('Failed to save pincode: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete pincode
  const handleDelete = async (pincode: PincodeMaster) => {
    if (!confirm(`Delete pincode ${pincode.pin_code} (${pincode.area_name || pincode.city})?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('pincode_master')
        .delete()
        .eq('id', pincode.id);

      if (deleteError) throw deleteError;
      fetchPincodes();

    } catch (err) {
      console.error('Error deleting pincode:', err);
      alert('Failed to delete pincode');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterRegion('');
    setFilterState('');
    setFilterServiceable('all');
  };

  // Handle CSV Upload
  const handleCSVUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    setCSVUploading(true);
    setCSVResults(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Expected headers: pin_code, area_name, city, district, state, region, sla_hours, service_priority, is_serviceable
      const requiredHeaders = ['pin_code', 'city', 'state', 'region'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        alert(`Missing required columns: ${missingHeaders.join(', ')}`);
        setCSVUploading(false);
        return;
      }

      const errors: string[] = [];
      let imported = 0;

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || null;
        });

        // Validate pin_code
        if (!row.pin_code || !/^\d{6}$/.test(row.pin_code)) {
          errors.push(`Row ${i + 1}: Invalid pincode ${row.pin_code}`);
          continue;
        }

        try {
          await supabase.from('pincode_master').insert({
            pin_code: row.pin_code,
            area_name: row.area_name || null,
            city: row.city,
            district: row.district || null,
            state: row.state,
            region: row.region,
            sla_hours: parseInt(row.sla_hours) || 48,
            service_priority: (row.service_priority as ServicePriority) || 'normal',
            is_serviceable: row.is_serviceable?.toLowerCase() !== 'false',
            primary_coordinator_id: null,
            created_by: user?.id
          });
          imported++;
        } catch (err: any) {
          if (err.code === '23505') {
            errors.push(`Row ${i + 1}: Pincode ${row.pin_code} already exists`);
          } else {
            errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      }

      setCSVResults({ imported, errors });
      fetchPincodes();

    } catch (err: any) {
      console.error('CSV upload error:', err);
      alert('Failed to process CSV file: ' + err.message);
    } finally {
      setCSVUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading pincodes...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-blue-600" />
            Pincode Master
          </h1>
          <p className="text-gray-500 mt-1">
            Manage serviceable pincodes and SLA configurations
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Pincode
            </button>
            <button
              onClick={() => setShowCSVModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload CSV
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
          <button onClick={fetchPincodes} className="ml-auto text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Pincodes</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.serviceable}</div>
          <div className="text-sm text-gray-500">Serviceable</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.nonServiceable}</div>
          <div className="text-sm text-gray-500">Non-Serviceable</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.withCoordinator}</div>
          <div className="text-sm text-gray-500">With Coordinator</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">{stats.uniqueRegions}</div>
          <div className="text-sm text-gray-500">Regions</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by pincode, city, area, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Regions</option>
                {REGIONS.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All States</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serviceable</label>
              <select
                value={filterServiceable}
                onChange={(e) => setFilterServiceable(e.target.value as 'all' | 'yes' | 'no')}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                <option value="yes">Serviceable Only</option>
                <option value="no">Non-Serviceable Only</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-4">
        Showing {filteredPincodes.length} of {pincodes.length} pincodes
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pincode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPincodes.map((pincode) => (
                <tr key={pincode.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-gray-900">{pincode.pin_code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {pincode.area_name || pincode.city}
                    </div>
                    <div className="text-xs text-gray-500">
                      {pincode.city}, {pincode.state}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {pincode.region}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {pincode.sla_hours}h
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[pincode.service_priority]}`}>
                      {pincode.service_priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pincode.coordinator ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pincode.coordinator.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pincode.coordinator.phone}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {pincode.is_serviceable ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(pincode)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pincode)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {filteredPincodes.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No pincodes found</p>
                    {(searchQuery || filterRegion || filterState || filterServiceable !== 'all') && (
                      <button 
                        onClick={clearFilters}
                        className="mt-2 text-blue-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingPincode ? 'Edit Pincode' : 'Add New Pincode'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pin_code}
                    onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="e.g., 400001"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                    disabled={!!editingPincode}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Name
                  </label>
                  <input
                    type="text"
                    value={formData.area_name}
                    onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
                    placeholder="e.g., Fort, Bandra West"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              
              {/* City and District */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Mumbai"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g., Mumbai City"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              
              {/* State and Region */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select Region</option>
                    {REGIONS.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* SLA and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SLA Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.sla_hours}
                    onChange={(e) => setFormData({ ...formData, sla_hours: parseInt(e.target.value) || 48 })}
                    min={1}
                    max={168}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time to complete calls in this area</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Priority
                  </label>
                  <select
                    value={formData.service_priority}
                    onChange={(e) => setFormData({ ...formData, service_priority: e.target.value as ServicePriority })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
              </div>
              
              {/* Coordinator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Coordinator
                </label>
                <select
                  value={formData.primary_coordinator_id}
                  onChange={(e) => setFormData({ ...formData, primary_coordinator_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No coordinator assigned</option>
                  {coordinators.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.full_name} ({coord.role})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Serviceable toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_serviceable}
                    onChange={(e) => setFormData({ ...formData, is_serviceable: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">
                  Serviceable Area
                </span>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {editingPincode ? 'Update' : 'Add'} Pincode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Upload Pincodes CSV</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCSVModal(false);
                    setCSVFile(null);
                    setCSVResults(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* CSV Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
                    <p className="text-sm text-blue-800 mb-2">
                      Required columns: <strong>pin_code, city, state, region</strong>
                    </p>
                    <p className="text-sm text-blue-800 mb-2">
                      Optional columns: area_name, district, sla_hours, service_priority, is_serviceable
                    </p>
                    <p className="text-sm text-blue-700">
                      Example: 110001,Connaught Place,Delhi,,Delhi,Delhi,48,normal,true
                    </p>
                  </div>
                </div>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCSVFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>

              {/* Results */}
              {csvResults && (
                <div className={`p-4 rounded-lg ${csvResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <h3 className="font-medium text-gray-900 mb-2">Upload Results</h3>
                  <p className="text-sm text-gray-700 mb-1">
                    ✓ Successfully imported: <strong>{csvResults.imported}</strong> pincodes
                  </p>
                  {csvResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-yellow-800 font-medium mb-1">
                        ⚠ Errors ({csvResults.errors.length}):
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        {csvResults.errors.slice(0, 10).map((error, idx) => (
                          <p key={idx} className="text-xs text-yellow-700">{error}</p>
                        ))}
                        {csvResults.errors.length > 10 && (
                          <p className="text-xs text-yellow-700 mt-1">
                            ... and {csvResults.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCSVModal(false);
                  setCSVFile(null);
                  setCSVResults(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                disabled={csvUploading}
              >
                {csvResults ? 'Close' : 'Cancel'}
              </button>
              {!csvResults && (
                <button
                  onClick={handleCSVUpload}
                  disabled={!csvFile || csvUploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {csvUploading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {csvUploading ? 'Uploading...' : 'Upload CSV'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
