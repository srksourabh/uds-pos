import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Search, Building2, ChevronRight, ChevronDown, Check, X, 
  Edit2, Save, RefreshCw, User, UserPlus, Briefcase, GitBranch,
  ArrowRight, AlertTriangle
} from 'lucide-react';

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_new: string;
  reports_to: string | null;
  hierarchy_level: number;
  office_id: string;
  phone: string;
  emp_id: string;
  status: string;
  manager?: UserProfile;
  subordinates?: UserProfile[];
  office?: { name: string; code: string };
};

type HierarchyLevel = {
  department: string;
  level: number;
  display_name: string;
  can_manage: string[];
  description: string;
};

const departmentColors: Record<string, string> = {
  'super_admin': 'bg-purple-100 text-purple-700 border-purple-300',
  'senior_manager': 'bg-red-100 text-red-700 border-red-300',
  'manager': 'bg-orange-100 text-orange-700 border-orange-300',
  'stock_manager': 'bg-amber-100 text-amber-700 border-amber-300',
  'senior_coordinator': 'bg-blue-100 text-blue-700 border-blue-300',
  'coordinator': 'bg-green-100 text-green-700 border-green-300',
  'stock_coordinator': 'bg-teal-100 text-teal-700 border-teal-300',
  'back_office_executive': 'bg-gray-100 text-gray-700 border-gray-300',
  'engineer': 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export function OrganizationManagement() {
  const { user, profile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editReportsTo, setEditReportsTo] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load hierarchy levels
      const { data: levels } = await supabase
        .from('hierarchy_levels')
        .select('*')
        .order('level');
      
      setHierarchyLevels(levels || []);

      // Load all users with their office info
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select(`
          *,
          office:office_id(name, code)
        `)
        .order('hierarchy_level, full_name');

      // Build hierarchy relationships
      const usersWithRelations = (usersData || []).map(u => {
        const manager = usersData?.find(m => m.id === u.reports_to);
        const subordinates = usersData?.filter(s => s.reports_to === u.id);
        return { ...u, manager, subordinates };
      });

      setUsers(usersWithRelations);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: UserProfile) => {
    setSelectedUser(user);
    setEditDepartment(user.department_new || '');
    setEditReportsTo(user.reports_to || '');
    setEditMode(true);
  };

  const cancelEditing = () => {
    setEditMode(false);
    setSelectedUser(null);
    setEditDepartment('');
    setEditReportsTo('');
  };

  const saveChanges = async () => {
    if (!selectedUser) return;

    setSaving(true);
    setMessage(null);

    try {
      // Get hierarchy level for the department
      const level = hierarchyLevels.find(h => h.department === editDepartment);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          department_new: editDepartment || null,
          reports_to: editReportsTo || null,
          hierarchy_level: level?.level || 6
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        activity_type: 'org_structure_change',
        entity_type: 'user_profiles',
        entity_id: selectedUser.id,
        actor_id: user?.id,
        actor_name: profile?.full_name,
        actor_role: profile?.role,
        office_id: selectedUser.office_id,
        description: `Updated ${selectedUser.full_name}'s department to ${editDepartment} and reporting structure`,
        old_data: { department: selectedUser.department_new, reports_to: selectedUser.reports_to },
        new_data: { department: editDepartment, reports_to: editReportsTo }
      });

      setMessage({ type: 'success', text: 'Changes saved successfully' });
      setEditMode(false);
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const getEligibleManagers = (userDept: string) => {
    const userLevel = hierarchyLevels.find(h => h.department === userDept);
    if (!userLevel) return [];

    // Get users at higher levels (lower level number)
    return users.filter(u => {
      const managerLevel = hierarchyLevels.find(h => h.department === u.department_new);
      return managerLevel && managerLevel.level < userLevel.level;
    });
  };

  const getDepartmentDisplay = (dept: string) => {
    const level = hierarchyLevels.find(h => h.department === dept);
    return level?.display_name || dept?.replace(/_/g, ' ') || 'Not Set';
  };

  const toggleExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.emp_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDepartment === 'all' || u.department_new === filterDepartment;
    
    return matchesSearch && matchesDept;
  });

  // Get top-level users (no manager) for tree view
  const topLevelUsers = users.filter(u => !u.reports_to && (u.role === 'super_admin' || u.department_new === 'super_admin'));

  const renderTreeNode = (user: UserProfile, depth: number = 0) => {
    const hasSubordinates = user.subordinates && user.subordinates.length > 0;
    const isExpanded = expandedUsers.has(user.id);

    return (
      <div key={user.id} className="select-none">
        <div 
          className={`flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
            selectedUser?.id === user.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => setSelectedUser(user)}
        >
          {hasSubordinates ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpanded(user.id); }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <div className="p-2 bg-gray-100 rounded-full">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{user.full_name}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${departmentColors[user.department_new] || 'bg-gray-100 text-gray-600'}`}>
                {getDepartmentDisplay(user.department_new)}
              </span>
            </div>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          {hasSubordinates && (
            <span className="text-xs text-gray-400">
              {user.subordinates?.length} direct report{user.subordinates?.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isExpanded && hasSubordinates && (
          <div>
            {user.subordinates?.map(sub => renderTreeNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Organization Structure</h1>
          <p className="text-gray-600 mt-1">Manage reporting hierarchy and departments</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                viewMode === 'tree' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Tree
            </button>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Hierarchy Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Hierarchy Levels
        </h2>
        <div className="flex flex-wrap gap-2">
          {hierarchyLevels.map(level => (
            <div 
              key={level.department}
              className={`px-3 py-2 rounded-lg border text-sm ${departmentColors[level.department] || 'bg-gray-100'}`}
            >
              <span className="font-medium">L{level.level}:</span> {level.display_name}
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>• <strong>Super Admin</strong> → Senior Managers</div>
          <div>• <strong>Senior Manager</strong> → Managers, Stock Managers</div>
          <div>• <strong>Manager</strong> → Senior Coordinators, Coordinators</div>
          <div>• <strong>Stock Manager</strong> → Senior Coordinators, Stock Coordinators</div>
          <div>• <strong>Coordinator</strong> → Engineers, Back Office Executives</div>
          <div>• <strong>Stock Coordinator</strong> → Back Office Executives</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {hierarchyLevels.slice(0, 5).map(level => {
          const count = users.filter(u => u.department_new === level.department).length;
          return (
            <div 
              key={level.department}
              className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition ${
                filterDepartment === level.department ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFilterDepartment(filterDepartment === level.department ? 'all' : level.department)}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{level.display_name}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, emp ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Departments</option>
            {hierarchyLevels.map(level => (
              <option key={level.department} value={level.department}>{level.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List / Tree */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              {viewMode === 'tree' ? 'Organization Tree' : `Team Members (${filteredUsers.length})`}
            </h2>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {viewMode === 'tree' ? (
              /* Tree View */
              topLevelUsers.length > 0 ? (
                topLevelUsers.map(u => renderTreeNode(u, 0))
              ) : (
                <div className="p-12 text-center">
                  <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hierarchy defined yet</p>
                  <p className="text-sm text-gray-400 mt-1">Assign managers to build the org tree</p>
                </div>
              )
            ) : (
              /* List View */
              <div className="divide-y divide-gray-200">
                {filteredUsers.map(u => (
                  <div 
                    key={u.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                      selectedUser?.id === u.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{u.full_name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {u.emp_id}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${departmentColors[u.department_new] || 'bg-gray-100 text-gray-600'}`}>
                            {getDepartmentDisplay(u.department_new)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{u.email}</span>
                          {u.office?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {u.office.name}
                            </span>
                          )}
                        </div>
                        {u.manager && (
                          <div className="mt-1 text-xs text-gray-400">
                            Reports to: {u.manager.full_name}
                          </div>
                        )}
                      </div>
                      {u.subordinates && u.subordinates.length > 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {u.subordinates.length} reports
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              {editMode ? 'Edit User' : 'User Details'}
            </h2>
          </div>

          <div className="p-6">
            {selectedUser ? (
              editMode ? (
                /* Edit Mode */
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-semibold text-gray-900">{selectedUser.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>

                  {/* Department Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Department
                    </label>
                    <select
                      value={editDepartment}
                      onChange={(e) => {
                        setEditDepartment(e.target.value);
                        setEditReportsTo(''); // Reset reports_to when department changes
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Department</option>
                      {hierarchyLevels.map(level => (
                        <option key={level.department} value={level.department}>
                          L{level.level}: {level.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reports To Selection */}
                  {editDepartment && editDepartment !== 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Reports To
                      </label>
                      <select
                        value={editReportsTo}
                        onChange={(e) => setEditReportsTo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select Manager</option>
                        {getEligibleManagers(editDepartment).map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.full_name} ({getDepartmentDisplay(manager.department_new)})
                          </option>
                        ))}
                      </select>
                      {getEligibleManagers(editDepartment).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No eligible managers found. Create higher-level users first.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {saving ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{selectedUser.full_name}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full border ${departmentColors[selectedUser.department_new] || 'bg-gray-100 text-gray-600'}`}>
                      {getDepartmentDisplay(selectedUser.department_new)}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Employee ID</span>
                      <span className="font-medium">{selectedUser.emp_id || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Office</span>
                      <span className="font-medium">{selectedUser.office?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Hierarchy Level</span>
                      <span className="font-medium">Level {selectedUser.hierarchy_level || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Reports To</span>
                      <span className="font-medium">{selectedUser.manager?.full_name || 'None'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Direct Reports</span>
                      <span className="font-medium">{selectedUser.subordinates?.length || 0}</span>
                    </div>
                  </div>

                  {/* Direct Reports List */}
                  {selectedUser.subordinates && selectedUser.subordinates.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Direct Reports:</p>
                      <div className="space-y-1">
                        {selectedUser.subordinates.map(sub => (
                          <div 
                            key={sub.id}
                            className="text-sm p-2 bg-gray-50 rounded flex items-center justify-between cursor-pointer hover:bg-gray-100"
                            onClick={() => setSelectedUser(sub)}
                          >
                            <span>{sub.full_name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${departmentColors[sub.department_new] || 'bg-gray-100'}`}>
                              {getDepartmentDisplay(sub.department_new)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <button
                      onClick={() => startEditing(selectedUser)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Structure
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Select a user to view details</p>
                <p className="text-sm text-gray-400 mt-1">Click on any team member</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
