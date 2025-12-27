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
  Globe,
  Truck,
  MapPinned,
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
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
  region_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Region {
  id: string;
  name: string;
  code: string | null;
  contact_person_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PincodeEntry {
  id: string;
  pincode: string;
  city: string;
  district: string | null;
  state: string;
  region: string;
  warehouse_id: string | null;
  primary_coordinator_id: string | null;
  is_serviceable: boolean;
  sla_hours: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  coordinator_name?: string | null;
  warehouse_name?: string | null;
}

interface CourierPartner {
  id: string;
  name: string;
  code: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tab types
type TabType = 'users' | 'customers' | 'warehouses' | 'regions' | 'pincodes' | 'couriers';

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

  // Regions state
  const [regions, setRegions] = useState<Region[]>([]);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionSearchTerm, setRegionSearchTerm] = useState('');

  // Pincode state
  const [pincodes, setPincodes] = useState<PincodeEntry[]>([]);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [editingPincode, setEditingPincode] = useState<PincodeEntry | null>(null);
  const [pincodeSearchTerm, setPincodeSearchTerm] = useState('');
  const [coordinators, setCoordinators] = useState<{ id: string; full_name: string }[]>([]);

  // Courier state
  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState<CourierPartner | null>(null);
  const [courierSearchTerm, setCourierSearchTerm] = useState('');

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
    home_pincode: '',
    office_id: '',
  });

  // CSV upload state
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvUploading, setCSVUploading] = useState(false);
  const [csvResults, setCSVResults] = useState<{success: number; failed: number; errors: string[]} | null>(null);

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
    region_id: '',
    is_active: true,
  });

  // Region form state
  const [regionForm, setRegionForm] = useState({
    name: '',
    code: '',
    contact_person_name: '',
    contact_email: '',
    contact_phone: '',
    manager_name: '',
    manager_phone: '',
    address: '',
    is_active: true,
  });

  // Pincode form state
  const [pincodeForm, setPincodeForm] = useState({
    pincode: '',
    city: '',
    district: '',
    state: '',
    region: '',
    warehouse_id: '',
    primary_coordinator_id: '',
    is_serviceable: true,
    sla_hours: 24,
  });

  // Courier form state
  const [courierForm, setCourierForm] = useState({
    name: '',
    code: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    billing_address: '',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
    loadModules();
    loadCustomers();
    loadWarehouses();
    loadRegions();
    loadPincodes();
    loadCouriers();
    loadCoordinators();
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

  const loadRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const loadPincodes = async () => {
    try {
      const { data, error } = await supabase
        .from('pincode_master')
        .select(`
          *,
          coordinator:primary_coordinator_id(id, full_name),
          warehouse:warehouse_id(id, name)
        `)
        .order('pincode');

      if (error) throw error;
      
      // Transform data to include joined fields
      const transformedData = (data || []).map((p: any) => ({
        ...p,
        coordinator_name: p.coordinator?.full_name || null,
        warehouse_name: p.warehouse?.name || null,
      }));
      
      setPincodes(transformedData);
    } catch (error) {
      console.error('Error loading pincodes:', error);
    }
  };

  const loadCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error loading couriers:', error);
    }
  };

  const loadCoordinators = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['coordinator', 'stock_coordinator', 'manager', 'senior_manager', 'admin', 'super_admin'])
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setCoordinators(data || []);
    } catch (error) {
      console.error('Error loading coordinators:', error);
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
    if (!newUser.email || !newUser.full_name || !newUser.home_pincode) {
      setFormError('Email, Full Name, and Pincode are required');
      return;
    }

    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(newUser.home_pincode)) {
      setFormError('Pincode must be exactly 6 digits');
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
        home_pincode: newUser.home_pincode || null,
        office_id: newUser.office_id || null,
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
        home_pincode: '',
        office_id: '',
      });
      loadUsers();
    } catch (error: any) {
      setFormError(error.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  // CSV Upload handler
  const handleCSVUpload = async () => {
    if (!csvFile) {
      setFormError('Please select a CSV file');
      return;
    }

    setCSVUploading(true);
    setFormError(null);
    setCSVResults(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setFormError('CSV file is empty or has no data rows');
        setCSVUploading(false);
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const expectedHeaders = ['email', 'full_name', 'phone', 'role', 'emp_id', 'designation', 'pincode', 'office_id'];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setFormError(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
        setCSVUploading(false);
        return;
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        try {
          // Validation
          if (!row.email || !row.full_name || !row.pincode) {
            results.errors.push(`Row ${i + 1}: Missing required fields (email, full_name, or pincode)`);
            results.failed++;
            continue;
          }

          if (!/^\d{6}$/.test(row.pincode)) {
            results.errors.push(`Row ${i + 1}: Invalid pincode format (must be 6 digits)`);
            results.failed++;
            continue;
          }

          // Check if email already exists
          const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', row.email.toLowerCase())
            .single();

          if (existingUser) {
            results.errors.push(`Row ${i + 1}: Email ${row.email} already exists`);
            results.failed++;
            continue;
          }

          // Create user
          const { error } = await supabase.from('user_profiles').insert({
            id: crypto.randomUUID(),
            email: row.email.toLowerCase(),
            full_name: row.full_name,
            phone: row.phone || null,
            role: row.role || 'engineer',
            emp_id: row.emp_id || null,
            designation: row.designation || null,
            home_pincode: row.pincode,
            office_id: row.office_id || null,
            active: true,
            status: 'pending_approval',
          });

          if (error) throw error;
          
          results.success++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
          results.failed++;
        }
      }

      setCSVResults(results);
      loadUsers();
    } catch (error: any) {
      setFormError(error.message || 'Failed to process CSV file');
    } finally {
      setCSVUploading(false);
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
            region_id: warehouseForm.region_id || null,
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
          region_id: warehouseForm.region_id || null,
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

  // Region handlers
  const handleAddRegion = () => {
    setEditingRegion(null);
    setRegionForm({
      name: '',
      code: '',
      contact_person_name: '',
      contact_email: '',
      contact_phone: '',
      manager_name: '',
      manager_phone: '',
      address: '',
      is_active: true,
    });
    setFormError(null);
    setShowRegionModal(true);
  };

  const handleEditRegion = (region: Region) => {
    setEditingRegion(region);
    setRegionForm({
      name: region.name,
      code: region.code || '',
      contact_person_name: region.contact_person_name || '',
      contact_email: region.contact_email || '',
      contact_phone: region.contact_phone || '',
      manager_name: region.manager_name || '',
      manager_phone: region.manager_phone || '',
      address: region.address || '',
      is_active: region.is_active,
    });
    setFormError(null);
    setShowRegionModal(true);
  };

  const handleSaveRegion = async () => {
    if (!regionForm.name) {
      setFormError('Region Name is required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingRegion) {
        const { error } = await supabase
          .from('regions')
          .update({
            name: regionForm.name,
            code: regionForm.code || null,
            contact_person_name: regionForm.contact_person_name || null,
            contact_email: regionForm.contact_email || null,
            contact_phone: regionForm.contact_phone || null,
            manager_name: regionForm.manager_name || null,
            manager_phone: regionForm.manager_phone || null,
            address: regionForm.address || null,
            is_active: regionForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRegion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('regions').insert({
          name: regionForm.name,
          code: regionForm.code || null,
          contact_person_name: regionForm.contact_person_name || null,
          contact_email: regionForm.contact_email || null,
          contact_phone: regionForm.contact_phone || null,
          manager_name: regionForm.manager_name || null,
          manager_phone: regionForm.manager_phone || null,
          address: regionForm.address || null,
          is_active: regionForm.is_active,
        });

        if (error) throw error;
      }

      setShowRegionModal(false);
      loadRegions();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save region');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRegion = async (region: Region) => {
    if (!confirm(`Are you sure you want to delete "${region.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', region.id);

      if (error) throw error;
      loadRegions();
    } catch (error: any) {
      alert(error.message || 'Failed to delete region');
    }
  };

  // Pincode handlers
  const handleAddPincode = () => {
    setEditingPincode(null);
    setPincodeForm({
      pincode: '',
      city: '',
      district: '',
      state: '',
      region: '',
      warehouse_id: '',
      primary_coordinator_id: '',
      is_serviceable: true,
      sla_hours: 24,
    });
    setFormError(null);
    setShowPincodeModal(true);
  };

  const handleEditPincode = (pincode: PincodeEntry) => {
    setEditingPincode(pincode);
    setPincodeForm({
      pincode: pincode.pincode,
      city: pincode.city,
      district: pincode.district || '',
      state: pincode.state,
      region: pincode.region,
      warehouse_id: pincode.warehouse_id || '',
      primary_coordinator_id: pincode.primary_coordinator_id || '',
      is_serviceable: pincode.is_serviceable,
      sla_hours: pincode.sla_hours,
    });
    setFormError(null);
    setShowPincodeModal(true);
  };

  const handleSavePincode = async () => {
    if (!pincodeForm.pincode || !pincodeForm.city || !pincodeForm.state) {
      setFormError('Pincode, City, and State are required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingPincode) {
        const { error } = await supabase
          .from('pincode_master')
          .update({
            pincode: pincodeForm.pincode,
            city: pincodeForm.city,
            district: pincodeForm.district || null,
            state: pincodeForm.state,
            region: pincodeForm.region || pincodeForm.state,
            warehouse_id: pincodeForm.warehouse_id || null,
            primary_coordinator_id: pincodeForm.primary_coordinator_id || null,
            is_serviceable: pincodeForm.is_serviceable,
            sla_hours: pincodeForm.sla_hours,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPincode.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('pincode_master').insert({
          pincode: pincodeForm.pincode,
          city: pincodeForm.city,
          district: pincodeForm.district || null,
          state: pincodeForm.state,
          region: pincodeForm.region || pincodeForm.state,
          warehouse_id: pincodeForm.warehouse_id || null,
          primary_coordinator_id: pincodeForm.primary_coordinator_id || null,
          is_serviceable: pincodeForm.is_serviceable,
          sla_hours: pincodeForm.sla_hours,
        });

        if (error) throw error;
      }

      setShowPincodeModal(false);
      loadPincodes();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save pincode');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePincode = async (pincode: PincodeEntry) => {
    if (!confirm(`Are you sure you want to delete pincode "${pincode.pincode}"?`)) return;

    try {
      const { error } = await supabase
        .from('pincode_master')
        .delete()
        .eq('id', pincode.id);

      if (error) throw error;
      loadPincodes();
    } catch (error: any) {
      alert(error.message || 'Failed to delete pincode');
    }
  };

  // Courier handlers
  const handleAddCourier = () => {
    setEditingCourier(null);
    setCourierForm({
      name: '',
      code: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      billing_address: '',
      is_active: true,
    });
    setFormError(null);
    setShowCourierModal(true);
  };

  const handleEditCourier = (courier: CourierPartner) => {
    setEditingCourier(courier);
    setCourierForm({
      name: courier.name,
      code: courier.code,
      contact_person: courier.contact_person || '',
      contact_email: courier.contact_email || '',
      contact_phone: courier.contact_phone || '',
      billing_address: courier.billing_address || '',
      is_active: courier.is_active,
    });
    setFormError(null);
    setShowCourierModal(true);
  };

  const handleSaveCourier = async () => {
    if (!courierForm.name || !courierForm.code) {
      setFormError('Courier Name and Code are required');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingCourier) {
        const { error } = await supabase
          .from('couriers')
          .update({
            name: courierForm.name,
            code: courierForm.code,
            contact_person: courierForm.contact_person || null,
            contact_email: courierForm.contact_email || null,
            contact_phone: courierForm.contact_phone || null,
            billing_address: courierForm.billing_address || null,
            is_active: courierForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCourier.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('couriers').insert({
          name: courierForm.name,
          code: courierForm.code,
          contact_person: courierForm.contact_person || null,
          contact_email: courierForm.contact_email || null,
          contact_phone: courierForm.contact_phone || null,
          billing_address: courierForm.billing_address || null,
          is_active: courierForm.is_active,
        });

        if (error) throw error;
      }

      setShowCourierModal(false);
      loadCouriers();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save courier');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourier = async (courier: CourierPartner) => {
    if (!confirm(`Are you sure you want to delete "${courier.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courier.id);

      if (error) throw error;
      loadCouriers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete courier');
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

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(regionSearchTerm.toLowerCase()) ||
    region.code?.toLowerCase().includes(regionSearchTerm.toLowerCase()) ||
    region.contact_person_name?.toLowerCase().includes(regionSearchTerm.toLowerCase()) ||
    region.manager_name?.toLowerCase().includes(regionSearchTerm.toLowerCase())
  );

  const filteredPincodes = pincodes.filter(pincode =>
    pincode.pincode.toLowerCase().includes(pincodeSearchTerm.toLowerCase()) ||
    pincode.city.toLowerCase().includes(pincodeSearchTerm.toLowerCase()) ||
    pincode.state.toLowerCase().includes(pincodeSearchTerm.toLowerCase()) ||
    pincode.region.toLowerCase().includes(pincodeSearchTerm.toLowerCase()) ||
    pincode.district?.toLowerCase().includes(pincodeSearchTerm.toLowerCase())
  );

  const filteredCouriers = couriers.filter(courier =>
    courier.name.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
    courier.code.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
    courier.contact_person?.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
    courier.contact_email?.toLowerCase().includes(courierSearchTerm.toLowerCase())
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
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-4 min-w-max">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
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
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
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
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'warehouses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Warehouse className="w-5 h-5" />
            Warehouses ({warehouses.length})
          </button>
          <button
            onClick={() => setActiveTab('regions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'regions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="w-5 h-5" />
            Regions ({regions.length})
          </button>
          <button
            onClick={() => setActiveTab('pincodes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pincodes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPinned className="w-5 h-5" />
            Pincodes ({pincodes.length})
          </button>
          <button
            onClick={() => setActiveTab('couriers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'couriers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Truck className="w-5 h-5" />
            Couriers ({couriers.length})
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add User
                </button>
                <button
                  onClick={() => setShowCSVUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  CSV Upload
                </button>
              </div>
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

      {/* Regions Tab */}
      {activeTab === 'regions' && (
        <div>
          {/* Regions Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search regions..."
                value={regionSearchTerm}
                onChange={(e) => setRegionSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleAddRegion}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Region
            </button>
          </div>

          {/* Regions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegions.map((region) => {
                    const warehouseCount = warehouses.filter(w => w.region_id === region.id).length;
                    return (
                      <tr key={region.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <Globe className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{region.name}</div>
                              {region.code && <div className="text-xs text-gray-500">Code: {region.code}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="flex items-center text-gray-900">
                              <User className="w-4 h-4 text-gray-400 mr-1" />
                              {region.contact_person_name || '-'}
                            </div>
                            {region.contact_email && (
                              <div className="flex items-center text-gray-500 text-xs">
                                <Mail className="w-3 h-3 text-gray-400 mr-1" />
                                {region.contact_email}
                              </div>
                            )}
                            {region.contact_phone && (
                              <div className="flex items-center text-gray-500 text-xs">
                                <Phone className="w-3 h-3 text-gray-400 mr-1" />
                                {region.contact_phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">{region.manager_name || '-'}</div>
                            {region.manager_phone && (
                              <div className="text-gray-500 text-xs">{region.manager_phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {warehouseCount} warehouse{warehouseCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            region.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {region.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEditRegion(region)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRegion(region)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredRegions.length === 0 && (
              <div className="p-12 text-center">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No regions found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pincodes Tab */}
      {activeTab === 'pincodes' && (
        <div>
          {/* Pincodes Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by pincode, city, state..."
                value={pincodeSearchTerm}
                onChange={(e) => setPincodeSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleAddPincode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Pincode
            </button>
          </div>

          {/* Pincodes List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pincode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPincodes.map((pincode) => (
                    <tr key={pincode.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <MapPinned className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="font-medium text-gray-900">{pincode.pincode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pincode.district || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.state}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.region}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.warehouse_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pincode.coordinator_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pincode.is_serviceable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pincode.is_serviceable ? 'Serviceable' : 'Not Serviceable'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditPincode(pincode)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePincode(pincode)}
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
            {filteredPincodes.length === 0 && (
              <div className="p-12 text-center">
                <MapPinned className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No pincodes found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Couriers Tab */}
      {activeTab === 'couriers' && (
        <div>
          {/* Couriers Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search couriers..."
                value={courierSearchTerm}
                onChange={(e) => setCourierSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleAddCourier}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Courier
            </button>
          </div>

          {/* Couriers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCouriers.map((courier) => (
                    <tr key={courier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                            <Truck className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{courier.name}</div>
                            <div className="text-xs text-gray-500">Code: {courier.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          {courier.contact_person || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          {courier.contact_email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          {courier.contact_phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {courier.billing_address || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          courier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {courier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditCourier(courier)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourier(courier)}
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
            {filteredCouriers.length === 0 && (
              <div className="p-12 text-center">
                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No couriers found</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                <input
                  type="text"
                  value={newUser.home_pincode}
                  onChange={(e) => setNewUser({ ...newUser, home_pincode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="700001"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office/Warehouse</label>
                <select
                  value={newUser.office_id}
                  onChange={(e) => setNewUser({ ...newUser, office_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Office/Warehouse</option>
                  {warehouses
                    .filter(w => w.is_active)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name} ({warehouse.city || 'N/A'})
                      </option>
                    ))}
                </select>
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

      {/* Region Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRegion ? 'Edit Region' : 'Add New Region'}
              </h2>
              <button
                onClick={() => setShowRegionModal(false)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Name *</label>
                  <input
                    type="text"
                    value={regionForm.name}
                    onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="East Zone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={regionForm.code}
                    onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="EAST"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={regionForm.contact_person_name}
                    onChange={(e) => setRegionForm({ ...regionForm, contact_person_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={regionForm.contact_email}
                    onChange={(e) => setRegionForm({ ...regionForm, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="contact@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={regionForm.contact_phone}
                  onChange={(e) => setRegionForm({ ...regionForm, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={regionForm.manager_name}
                    onChange={(e) => setRegionForm({ ...regionForm, manager_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Manager name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Phone</label>
                  <input
                    type="tel"
                    value={regionForm.manager_phone}
                    onChange={(e) => setRegionForm({ ...regionForm, manager_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={regionForm.address}
                  onChange={(e) => setRegionForm({ ...regionForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Regional office address"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regionForm.is_active}
                    onChange={(e) => setRegionForm({ ...regionForm, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRegionModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRegion}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {editingRegion ? 'Save Changes' : 'Add Region'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pincode Modal */}
      {showPincodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPincode ? 'Edit Pincode' : 'Add New Pincode'}
              </h2>
              <button
                onClick={() => setShowPincodeModal(false)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={pincodeForm.pincode}
                    onChange={(e) => setPincodeForm({ ...pincodeForm, pincode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="700001"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={pincodeForm.city}
                    onChange={(e) => setPincodeForm({ ...pincodeForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Kolkata"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    value={pincodeForm.district}
                    onChange={(e) => setPincodeForm({ ...pincodeForm, district: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Kolkata"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    value={pincodeForm.state}
                    onChange={(e) => setPincodeForm({ ...pincodeForm, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="West Bengal"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                <input
                  type="text"
                  value={pincodeForm.region}
                  onChange={(e) => setPincodeForm({ ...pincodeForm, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="East Zone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                <select
                  value={pincodeForm.warehouse_id}
                  onChange={(e) => setPincodeForm({ ...pincodeForm, warehouse_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.filter(w => w.is_active).map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Coordinator</label>
                <select
                  value={pincodeForm.primary_coordinator_id}
                  onChange={(e) => setPincodeForm({ ...pincodeForm, primary_coordinator_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Coordinator</option>
                  {coordinators.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA Hours</label>
                  <input
                    type="number"
                    value={pincodeForm.sla_hours}
                    onChange={(e) => setPincodeForm({ ...pincodeForm, sla_hours: parseInt(e.target.value) || 24 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min={1}
                    max={168}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pincodeForm.is_serviceable}
                      onChange={(e) => setPincodeForm({ ...pincodeForm, is_serviceable: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Serviceable</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPincodeModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePincode}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {editingPincode ? 'Save Changes' : 'Add Pincode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCourier ? 'Edit Courier' : 'Add New Courier'}
              </h2>
              <button
                onClick={() => setShowCourierModal(false)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Courier Name *</label>
                  <input
                    type="text"
                    value={courierForm.name}
                    onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Blue Dart"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={courierForm.code}
                    onChange={(e) => setCourierForm({ ...courierForm, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="BD"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={courierForm.contact_person}
                  onChange={(e) => setCourierForm({ ...courierForm, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Account Manager"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={courierForm.contact_email}
                    onChange={(e) => setCourierForm({ ...courierForm, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="support@courier.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={courierForm.contact_phone}
                    onChange={(e) => setCourierForm({ ...courierForm, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                <textarea
                  value={courierForm.billing_address}
                  onChange={(e) => setCourierForm({ ...courierForm, billing_address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Billing address for invoices"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courierForm.is_active}
                    onChange={(e) => setCourierForm({ ...courierForm, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCourierModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCourier}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {editingCourier ? 'Save Changes' : 'Add Courier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-green-600" />
                Bulk Upload Users (CSV)
              </h2>
              <button
                onClick={() => {
                  setShowCSVUploadModal(false);
                  setCSVFile(null);
                  setCSVResults(null);
                  setFormError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FileUp className="w-5 h-5" />
                  CSV Format Requirements
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Required columns:</strong> email, full_name, pincode</p>
                  <p><strong>Optional columns:</strong> phone, role, emp_id, designation, office_id</p>
                  <p><strong>Note:</strong> First row must be the header with column names (case-insensitive)</p>
                </div>
              </div>

              {/* CSV Template Example */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Example CSV Format:</h4>
                <pre className="text-xs bg-white p-3 rounded border border-gray-300 overflow-x-auto">
{`email,full_name,phone,role,emp_id,designation,pincode,office_id
john@example.com,John Doe,+919876543210,engineer,UDSPL001,Field Engineer,700001,
jane@example.com,Jane Smith,+919876543211,coordinator,UDSPL002,Stock Coordinator,700002,warehouse-id-here`}
                </pre>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                          setFormError('Please select a valid CSV file');
                          setCSVFile(null);
                        } else {
                          setCSVFile(file);
                          setFormError(null);
                          setCSVResults(null);
                        }
                      }
                    }}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {csvFile && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      {csvFile.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              {csvResults && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">Success</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{csvResults.success}</div>
                      <div className="text-xs text-green-600">Users created</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700 mb-1">
                        <XCircle className="w-5 h-5" />
                        <span className="font-semibold">Failed</span>
                      </div>
                      <div className="text-2xl font-bold text-red-900">{csvResults.failed}</div>
                      <div className="text-xs text-red-600">Errors occurred</div>
                    </div>
                  </div>

                  {csvResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
                      <ul className="text-sm text-red-800 space-y-1">
                        {csvResults.errors.map((error, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-600 mt-0.5">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCSVUploadModal(false);
                  setCSVFile(null);
                  setCSVResults(null);
                  setFormError(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                {csvResults ? 'Close' : 'Cancel'}
              </button>
              {!csvResults && (
                <button
                  onClick={handleCSVUpload}
                  disabled={!csvFile || csvUploading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csvUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload & Create Users
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}