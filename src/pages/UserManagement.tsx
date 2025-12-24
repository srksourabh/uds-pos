import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import type { UserRole } from '../lib/database.types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  Warehouse,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  Phone,
  Mail,
  MapPin,
  User,
} from 'lucide-react';
import {
  getAllModules,
  getUserPermissions,
  grantModulePermission,
  revokeModulePermission,
  grantAllPermissions,
} from '../lib/permissions';

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  active: boolean;
  status: string;
  created_at: string;
  emp_id?: string;
  designation?: string;
  office_id?: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  display_name: string;
  icon: string;
}

interface UserPermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface Customer {
  id: string;
  name: string;
  short_name: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  billing_address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WarehouseOffice {
  id: string;
  name: string;
  code: string;
  office_type: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  capacity: number | null;
  current_stock: number | null;
  created_at: string;
  updated_at: string;
}

// Tab types
type TabType = 'users' | 'customers' | 'warehouses';

// Role definitions with display names
const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
  { value: 'admin', label: 'Admin', description: 'Administrative access' },
  { value: 'project_head' as UserRole, label: 'Project Head', description: 'Project oversight' },
  { value: 'zonal_head' as UserRole, label: 'Zonal Head', description: 'Zone management' },
  { value: 'regional_manager' as UserRole, label: 'Regional Manager', description: 'Regional operations' },
  { value: 'senior_manager', label: 'Senior Manager', description: 'Senior management' },
  { value: 'manager', label: 'Manager', description: 'Team management' },
  { value: 'coordinator', label: 'Coordinator', description: 'Coordination tasks' },
  { value: 'stock_coordinator', label: 'Stock Coordinator', description: 'Inventory management' },
  { value: 'logistics_manager' as UserRole, label: 'Logistics Manager', description: 'Logistics oversight' },
  { value: 'logistics_executive' as UserRole, label: 'Logistics Executive', description: 'Logistics operations' },
  { value: 'engineer', label: 'Engineer', description: 'Field service' },
  { value: 'spoc_customer' as UserRole, label: 'SPOC Customer', description: 'Customer liaison' },
];

// Office types
const OFFICE_TYPES = [
  { value: 'head_office', label: 'Head Office' },
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'service_center', label: 'Service Center' },
  { value: 'hub', label: 'Hub' },
];

export function UserManagement() {
  useAuth();
  const { isSuperAdmin, isAdmin } = usePermissions();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Map<string, UserPermission>>(new Map());
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Warehouse state
  const [warehouses, setWarehouses] = useState<WarehouseOffice[]>([]);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseOffice | null>(null);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState('');

  // Form state
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'engineer' as UserRole,
    emp_id: '',
    designation: '',
  });

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    name: '',
    short_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    billing_address: '',
    status: 'active',
  });

  // Warehouse form state
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    office_type: 'warehouse',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    manager_name: '',
    manager_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    capacity: 1000,
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
    loadModules();
    loadCustomers();
    loadWarehouses();
  }, []);

  // Load functions
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('role')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    const mods = await getAllModules();
    setModules(mods);
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

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
    }
  };

  const loadUserPermissions = async (userId: string) => {
    const permissions = await getUserPermissions(userId);
    const permMap = new Map<string, UserPermission>();
    permissions.forEach(p => {
      if (p.module_name) {
        permMap.set(p.module_name, {
          module_name: p.module_name,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        });
      }
    });
    setUserPermissions(permMap);
  };

  // User management functions
  const toggleUserExpanded = async (user: User) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(user.id)) {
      newExpanded.delete(user.id);
      setSelectedUser(null);
    } else {
      newExpanded.clear();
      newExpanded.add(user.id);
      setSelectedUser(user);
      await loadUserPermissions(user.id);
    }
    setExpandedUsers(newExpanded);
  };

  const handlePermissionChange = async (
    moduleName: string,
    permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedUser) return;

    const currentPerm = userPermissions.get(moduleName) || {
      module_name: moduleName,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };

    const newPerm = { ...currentPerm, [permission]: value };

    if (permission === 'can_view' && !value) {
      newPerm.can_create = false;
      newPerm.can_edit = false;
      newPerm.can_delete = false;
    }

    const newPermMap = new Map(userPermissions);
    newPermMap.set(moduleName, newPerm);
    setUserPermissions(newPermMap);

    setSavingPermissions(true);
    try {
      if (!newPerm.can_view) {
        await revokeModulePermission(selectedUser.id, moduleName);
      } else {
        await grantModulePermission(selectedUser.id, moduleName, {
          can_view: newPerm.can_view,
          can_create: newPerm.can_create,
          can_edit: newPerm.can_edit,
          can_delete: newPerm.can_delete,
        });
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      await loadUserPermissions(selectedUser.id);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleGrantAll = async () => {
    if (!selectedUser) return;
    setSavingPermissions(true);
    try {
      await grantAllPermissions(selectedUser.id);
      await loadUserPermissions(selectedUser.id);
    } catch (error) {
      console.error('Error granting all permissions:', error);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to update role');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      setFormError('Email and Full Name are required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      // First check if email already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newUser.email.toLowerCase())
        .single();

      if (existingUser) {
        setFormError('A user with this email already exists');
        setFormLoading(false);
        return;
      }

      // Create user in auth.users via Supabase Auth Admin (requires service role)
      // For now, we'll create the profile and let the user sign up
      const { error } = await supabase.from('user_profiles').insert({
        id: crypto.randomUUID(),
        email: newUser.email.toLowerCase(),
        full_name: newUser.full_name,
        phone: newUser.phone || null,
        role: newUser.role,
        emp_id: newUser.emp_id || null,
        designation: newUser.designation || null,
        active: true,
        status: 'pending_approval',
      });

      if (error) throw error;

      setShowCreateUserModal(false);
      setNewUser({
        email: '',
        full_name: '',
        phone: '',
        role: 'engineer',
        emp_id: '',
        designation: '',
      });
      loadUsers();
    } catch (error: any) {
      setFormError(error.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  // Customer management functions
  const openCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name,
        short_name: customer.short_name || '',
        contact_person: customer.contact_person || '',
        contact_email: customer.contact_email || '',
        contact_phone: customer.contact_phone || '',
        address: customer.address || '',
        billing_address: customer.billing_address || '',
        status: customer.status,
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        short_name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        billing_address: '',
        status: 'active',
      });
    }
    setFormError(null);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name) {
      setFormError('Customer Name is required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerForm.name,
            short_name: customerForm.short_name || null,
            contact_person: customerForm.contact_person || null,
            contact_email: customerForm.contact_email || null,
            contact_phone: customerForm.contact_phone || null,
            address: customerForm.address || null,
            billing_address: customerForm.billing_address || null,
            status: customerForm.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert({
          name: customerForm.name,
          short_name: customerForm.short_name || null,
          contact_person: customerForm.contact_person || null,
          contact_email: customerForm.contact_email || null,
          contact_phone: customerForm.contact_phone || null,
          address: customerForm.address || null,
          billing_address: customerForm.billing_address || null,
          status: customerForm.status,
        });

        if (error) throw error;
      }

      setShowCustomerModal(false);
      loadCustomers();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save customer');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;
      loadCustomers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete customer');
    }
  };

  // Warehouse management functions
  const openWarehouseModal = (warehouse?: WarehouseOffice) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setWarehouseForm({
        name: warehouse.name,
        code: warehouse.code,
        office_type: warehouse.office_type || 'warehouse',
        contact_person: warehouse.contact_person || '',
        contact_email: warehouse.contact_email || '',
        contact_phone: warehouse.contact_phone || '',
        manager_name: warehouse.manager_name || '',
        manager_phone: warehouse.manager_phone || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        pincode: warehouse.pincode || '',
        capacity: warehouse.capacity || 1000,
        is_active: warehouse.is_active,
      });
    } else {
      setEditingWarehouse(null);
      setWarehouseForm({
        name: '',
        code: '',
        office_type: 'warehouse',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        manager_name: '',
        manager_phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        capacity: 1000,
        is_active: true,
      });
    }
    setFormError(null);
    setShowWarehouseModal(true);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.name || !warehouseForm.code) {
      setFormError('Warehouse Name and Code are required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingWarehouse) {
        const { error } = await supabase
          .from('warehouses')
          .update({
            name: warehouseForm.name,
            code: warehouseForm.code,
            office_type: warehouseForm.office_type,
            contact_person: warehouseForm.contact_person || null,
            contact_email: warehouseForm.contact_email || null,
            contact_phone: warehouseForm.contact_phone || null,
            manager_name: warehouseForm.manager_name || null,
            manager_phone: warehouseForm.manager_phone || null,
            address: warehouseForm.address || null,
            city: warehouseForm.city || null,
            state: warehouseForm.state || null,
            pincode: warehouseForm.pincode || null,
            capacity: warehouseForm.capacity,
            is_active: warehouseForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWarehouse.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('warehouses').insert({
          name: warehouseForm.name,
          code: warehouseForm.code,
          office_type: warehouseForm.office_type,
          contact_person: warehouseForm.contact_person || null,
          contact_email: warehouseForm.contact_email || null,
          contact_phone: warehouseForm.contact_phone || null,
          manager_name: warehouseForm.manager_name || null,
          manager_phone: warehouseForm.manager_phone || null,
          address: warehouseForm.address || null,
          city: warehouseForm.city || null,
          state: warehouseForm.state || null,
          pincode: warehouseForm.pincode || null,
          capacity: warehouseForm.capacity,
          is_active: warehouseForm.is_active,
        });

        if (error) throw error;
      }

      setShowWarehouseModal(false);
      loadWarehouses();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save warehouse');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteWarehouse = async (warehouse: WarehouseOffice) => {
    if (!confirm(`Are you sure you want to delete "${warehouse.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouse.id);

      if (error) throw error;
      loadWarehouses();
    } catch (error: any) {
      alert(error.message || 'Failed to delete warehouse');
    }
  };

  // Filtered data
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.emp_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.contact_email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
    warehouse.code.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
    warehouse.city?.toLowerCase().includes(warehouseSearchTerm.toLowerCase())
  );

  // Role styling
  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    project_head: 'bg-indigo-100 text-indigo-800',
    zonal_head: 'bg-cyan-100 text-cyan-800',
    regional_manager: 'bg-teal-100 text-teal-800',
    senior_manager: 'bg-emerald-100 text-emerald-800',
    manager: 'bg-green-100 text-green-800',
    coordinator: 'bg-lime-100 text-lime-800',
    stock_coordinator: 'bg-yellow-100 text-yellow-800',
    logistics_manager: 'bg-amber-100 text-amber-800',
    logistics_executive: 'bg-orange-100 text-orange-800',
    engineer: 'bg-green-100 text-green-800',
    spoc_customer: 'bg-rose-100 text-rose-800',
  };

  const roleIcons: Record<string, any> = {
    super_admin: ShieldAlert,
    admin: ShieldCheck,
    project_head: Shield,
    zonal_head: Shield,
    regional_manager: Shield,
    senior_manager: Shield,
    manager: Shield,
    coordinator: Users,
    stock_coordinator: Warehouse,
    logistics_manager: Warehouse,
    logistics_executive: Warehouse,
    engineer: Users,
    spoc_customer: Building2,
  };

  // Access control
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          {isSuperAdmin ? 'Manage users, customers, and warehouses' : 'View and manage team members'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'warehouses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Warehouse className="w-5 h-5" />
            Warehouses/Offices ({warehouses.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Users Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            {(isSuperAdmin || isAdmin) && (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add User
              </button>
            )}
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const RoleIcon = roleIcons[user.role] || Users;
              const isExpanded = expandedUsers.has(user.id);
              const canManagePermissions = isSuperAdmin && user.role === 'admin';

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div
                    className={`p-4 sm:p-6 ${canManagePermissions ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => canManagePermissions && toggleUserExpanded(user)}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <RoleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.emp_id && (
                            <p className="text-xs text-gray-400">ID: {user.emp_id}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                        {isSuperAdmin && user.role !== 'super_admin' && (
                          <select
                            value={user.role}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRoleChange(user.id, e.target.value as UserRole);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {ROLE_OPTIONS.filter(r => r.value !== 'super_admin').map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        )}
                        {canManagePermissions && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Permissions Panel */}
                  {isExpanded && canManagePermissions && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">Module Permissions</h4>
                        <button
                          onClick={handleGrantAll}
                          disabled={savingPermissions}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Grant All
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modules.map((module) => {
                          const perm = userPermissions.get(module.name);
                          return (
                            <div key={module.id} className="bg-white rounded-lg border p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900">{module.display_name}</span>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={perm?.can_view || false}
                                    onChange={(e) => handlePermissionChange(module.name, 'can_view', e.target.checked)}
                                    disabled={savingPermissions}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  Access
                                </label>
                              </div>
                              {perm?.can_view && (
                                <div className="flex gap-4 text-sm text-gray-600">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={perm?.can_create || false}
                                      onChange={(e) => handlePermissionChange(module.name, 'can_create', e.target.checked)}
                                      disabled={savingPermissions}
                                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    Create
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={perm?.can_edit || false}
                                      onChange={(e) => handlePermissionChange(module.name, 'can_edit', e.target.checked)}
                                      disabled={savingPermissions}
                                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                    />
                                    Edit
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={perm?.can_delete || false}
                                      onChange={(e) => handlePermissionChange(module.name, 'can_delete', e.target.checked)}
                                      disabled={savingPermissions}
                                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    Delete
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {savingPermissions && (
                        <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          {/* Customers Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={() => openCustomerModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Customer
            </button>
          </div>

          {/* Customers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            {customer.short_name && (
                              <div className="text-xs text-gray-500">{customer.short_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          {customer.contact_person || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          {customer.contact_email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          {customer.contact_phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openCustomerModal(customer)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCustomers.length === 0 && (
              <div className="p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No customers found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <div>
          {/* Warehouses Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search warehouses/offices..."
                value={warehouseSearchTerm}
                onChange={(e) => setWarehouseSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={() => openWarehouseModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Warehouse/Office
            </button>
          </div>

          {/* Warehouses List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredWarehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                            <Warehouse className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{warehouse.name}</div>
                            <div className="text-xs text-gray-500">ID: {warehouse.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {warehouse.office_type?.replace(/_/g, ' ') || 'Warehouse'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-900">
                            <User className="w-4 h-4 text-gray-400 mr-1" />
                            {warehouse.contact_person || '-'}
                          </div>
                          <div className="flex items-center text-gray-500 text-xs">
                            <Mail className="w-3 h-3 text-gray-400 mr-1" />
                            {warehouse.contact_email || '-'}
                          </div>
                          <div className="flex items-center text-gray-500 text-xs">
                            <Phone className="w-3 h-3 text-gray-400 mr-1" />
                            {warehouse.contact_phone || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900">{warehouse.manager_name || '-'}</div>
                          <div className="text-gray-500 text-xs">{warehouse.manager_phone || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                          {warehouse.city || '-'}, {warehouse.state || '-'}
                        </div>
                        {warehouse.pincode && (
                          <div className="text-xs text-gray-500">{warehouse.pincode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          warehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {warehouse.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openWarehouseModal(warehouse)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWarehouse(warehouse)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredWarehouses.length === 0 && (
              <div className="p-12 text-center">
                <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No warehouses/offices found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {ROLE_OPTIONS.filter(r => isSuperAdmin || r.value !== 'super_admin').map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={newUser.emp_id}
                  onChange={(e) => setNewUser({ ...newUser, emp_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="UDSPL0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={newUser.designation}
                  onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Field Service Engineer"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Hitachi Payment Services"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                <input
                  type="text"
                  value={customerForm.short_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, short_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="HPS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={customerForm.contact_person}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={customerForm.contact_email}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={customerForm.contact_phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="123 Business Street, City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                <textarea
                  value={customerForm.billing_address}
                  onChange={(e) => setCustomerForm({ ...customerForm, billing_address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Billing address (if different)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={customerForm.status}
                  onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {editingCustomer ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingWarehouse ? 'Edit Warehouse/Office' : 'Add New Warehouse/Office'}
              </h2>
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Kolkata Main Warehouse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID/Code *</label>
                  <input
                    type="text"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="KOL-WH-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Type</label>
                <select
                  value={warehouseForm.office_type}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, office_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {OFFICE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={warehouseForm.contact_person}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={warehouseForm.contact_email}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="warehouse@uds.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={warehouseForm.contact_phone}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={warehouseForm.manager_name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Manager name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Phone</label>
                  <input
                    type="tel"
                    value={warehouseForm.manager_phone}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={warehouseForm.city}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Kolkata"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={warehouseForm.state}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="West Bengal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={warehouseForm.pincode}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, pincode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="700001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={warehouseForm.capacity}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="1000"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={warehouseForm.is_active}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWarehouse}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {editingWarehouse ? 'Save Changes' : 'Add Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}