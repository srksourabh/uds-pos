import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getAllModules,
  getUserPermissions,
  grantModulePermission,
  revokeModulePermission,
  grantAllPermissions,
} from '../lib/permissions';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
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

export function UserManagement() {
  const { profile } = useAuth();
  const { isSuperAdmin, isAdmin } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Map<string, UserPermission>>(new Map());
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
    loadModules();
  }, []);

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

  const toggleUserExpanded = async (user: User) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(user.user_id)) {
      newExpanded.delete(user.user_id);
      setSelectedUser(null);
    } else {
      newExpanded.clear(); // Only one expanded at a time
      newExpanded.add(user.user_id);
      setSelectedUser(user);
      await loadUserPermissions(user.user_id);
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

    // If turning off view, turn off all other permissions
    if (permission === 'can_view' && !value) {
      newPerm.can_create = false;
      newPerm.can_edit = false;
      newPerm.can_delete = false;
    }

    // Update local state immediately
    const newPermMap = new Map(userPermissions);
    newPermMap.set(moduleName, newPerm);
    setUserPermissions(newPermMap);

    // Save to database
    setSavingPermissions(true);
    try {
      if (!newPerm.can_view) {
        await revokeModulePermission(selectedUser.user_id, moduleName);
      } else {
        await grantModulePermission(selectedUser.user_id, moduleName, {
          can_view: newPerm.can_view,
          can_create: newPerm.can_create,
          can_edit: newPerm.can_edit,
          can_delete: newPerm.can_delete,
        });
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      // Revert on error
      await loadUserPermissions(selectedUser.user_id);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleGrantAll = async () => {
    if (!selectedUser) return;
    setSavingPermissions(true);
    try {
      await grantAllPermissions(selectedUser.user_id);
      await loadUserPermissions(selectedUser.user_id);
    } catch (error) {
      console.error('Error granting all permissions:', error);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Only super_admin can change roles
    if (!isSuperAdmin) return;

    // Admins cannot be promoted by other admins
    if (!isSuperAdmin && (newRole === 'admin' || newRole === 'super_admin')) {
      alert('Only super admin can create or promote to admin role');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to update role');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    engineer: 'bg-green-100 text-green-800',
    warehouse: 'bg-yellow-100 text-yellow-800',
    courier: 'bg-orange-100 text-orange-800',
  };

  const roleIcons: Record<string, any> = {
    super_admin: ShieldAlert,
    admin: ShieldCheck,
    engineer: Users,
    warehouse: Users,
    courier: Users,
  };

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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            {isSuperAdmin
              ? 'Manage all users and their permissions'
              : 'View and manage engineers'}
          </p>
        </div>
        {(isSuperAdmin || isAdmin) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            {isSuperAdmin && <option value="admin">Admin</option>}
            <option value="engineer">Engineer</option>
            <option value="warehouse">Warehouse</option>
            <option value="courier">Courier</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const RoleIcon = roleIcons[user.role] || Users;
          const isExpanded = expandedUsers.has(user.user_id);
          const canManagePermissions = isSuperAdmin && user.role === 'admin';

          return (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div
                className={`p-6 ${canManagePermissions ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => canManagePermissions && toggleUserExpanded(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <RoleIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[user.role]}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {isSuperAdmin && user.role !== 'super_admin' && (
                      <select
                        value={user.role}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRoleChange(user.user_id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="admin">Admin</option>
                        <option value="engineer">Engineer</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="courier">Courier</option>
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
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
  );
}
