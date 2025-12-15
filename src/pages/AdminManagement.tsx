import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Search, Plus, Building2, Briefcase, Check, X, 
  Edit2, Trash2, Save, RefreshCw, UserPlus, MapPin
} from 'lucide-react';

type Admin = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  phone: string;
  emp_id: string;
  status: string;
  assigned_offices: Office[];
};

type Office = {
  id: string;
  name: string;
  code: string;
  is_primary?: boolean;
};

type Department = {
  value: string;
  label: string;
  color: string;
};

const departments: Department[] = [
  { value: 'coordinator', label: 'Coordinator', color: 'bg-blue-100 text-blue-700' },
  { value: 'senior_coordinator', label: 'Senior Coordinator', color: 'bg-purple-100 text-purple-700' },
  { value: 'manager', label: 'Manager', color: 'bg-green-100 text-green-700' },
  { value: 'stock_manager', label: 'Stock Manager', color: 'bg-orange-100 text-orange-700' },
  { value: 'stock_executive', label: 'Stock Executive', color: 'bg-teal-100 text-teal-700' },
];

export function AdminManagement() {
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editOffices, setEditOffices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load offices
      const { data: officesData } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      
      setOffices(officesData || []);

      // Load admins with their office assignments
      const { data: adminsData } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, department, phone, emp_id, status')
        .in('role', ['admin', 'super_admin'])
        .order('full_name');

      // Get office assignments for each admin
      const adminsWithOffices = await Promise.all(
        (adminsData || []).map(async (admin) => {
          const { data: assignments } = await supabase
            .from('admin_office_assignments')
            .select('office_id, is_primary')
            .eq('admin_id', admin.id);

          const assignedOffices = (assignments || []).map(a => {
            const office = officesData?.find(o => o.id === a.office_id);
            return office ? { ...office, is_primary: a.is_primary } : null;
          }).filter(Boolean) as Office[];

          return { ...admin, assigned_offices: assignedOffices };
        })
      );

      setAdmins(adminsWithOffices);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (admin: Admin) => {
    setEditingAdmin(admin.id);
    setEditDepartment(admin.department || '');
    setEditOffices(admin.assigned_offices.map(o => o.id));
  };

  const cancelEditing = () => {
    setEditingAdmin(null);
    setEditDepartment('');
    setEditOffices([]);
  };

  const saveAdmin = async (adminId: string) => {
    setSaving(true);
    setMessage(null);

    try {
      // Update department
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ department: editDepartment || null })
        .eq('id', adminId);

      if (updateError) throw updateError;

      // Delete existing office assignments
      await supabase
        .from('admin_office_assignments')
        .delete()
        .eq('admin_id', adminId);

      // Insert new office assignments
      if (editOffices.length > 0) {
        const assignments = editOffices.map((officeId, index) => ({
          admin_id: adminId,
          office_id: officeId,
          is_primary: index === 0,
          assigned_by: user?.id
        }));

        const { error: insertError } = await supabase
          .from('admin_office_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      setMessage({ type: 'success', text: 'Admin updated successfully' });
      setEditingAdmin(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving admin:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const toggleOffice = (officeId: string) => {
    setEditOffices(prev => 
      prev.includes(officeId)
        ? prev.filter(id => id !== officeId)
        : [...prev, officeId]
    );
  };

  const getDepartmentInfo = (dept: string) => {
    return departments.find(d => d.value === dept) || { label: dept, color: 'bg-gray-100 text-gray-700' };
  };

  const filteredAdmins = admins.filter(admin => {
    const search = searchTerm.toLowerCase();
    return (
      admin.full_name?.toLowerCase().includes(search) ||
      admin.email?.toLowerCase().includes(search) ||
      admin.department?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-1">Manage departments and office assignments</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Departments Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Departments</h2>
        <div className="flex flex-wrap gap-3">
          {departments.map(dept => (
            <span key={dept.value} className={`px-4 py-2 rounded-lg text-sm font-medium ${dept.color}`}>
              {dept.label}
            </span>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Admins ({filteredAdmins.length})</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAdmins.map(admin => (
            <div key={admin.id} className="p-6">
              {editingAdmin === admin.id ? (
                /* Editing Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{admin.full_name}</h3>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveAdmin(admin.id)}
                        disabled={saving}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Department Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Department
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map(dept => (
                        <button
                          key={dept.value}
                          onClick={() => setEditDepartment(dept.value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                            editDepartment === dept.value
                              ? `${dept.color} border-current`
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {dept.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Office Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Assigned Offices (select multiple)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {offices.map(office => (
                        <button
                          key={office.id}
                          onClick={() => toggleOffice(office.id)}
                          className={`p-3 rounded-lg text-sm font-medium border-2 transition text-left ${
                            editOffices.includes(office.id)
                              ? 'bg-blue-50 text-blue-700 border-blue-500'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {editOffices.includes(office.id) && <Check className="w-4 h-4" />}
                            <div>
                              <p className="font-medium">{office.name}</p>
                              <p className="text-xs opacity-75">{office.code}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {editOffices.length} office(s)
                    </p>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-full">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{admin.full_name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      
                      {/* Department */}
                      <div className="flex items-center gap-2 mt-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        {admin.department ? (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getDepartmentInfo(admin.department).color}`}>
                            {getDepartmentInfo(admin.department).label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No department assigned</span>
                        )}
                      </div>

                      {/* Assigned Offices */}
                      <div className="flex items-start gap-2 mt-2">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {admin.assigned_offices.length > 0 ? (
                            admin.assigned_offices.map(office => (
                              <span
                                key={office.id}
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  office.is_primary ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {office.name}
                                {office.is_primary && ' (Primary)'}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No offices assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <button
                      onClick={() => startEditing(admin)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
