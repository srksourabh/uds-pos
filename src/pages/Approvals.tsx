import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, UserX, Clock, Phone, Mail, RefreshCw } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  bank?: Database['public']['Tables']['banks']['Row'];
};

export function Approvals() {
  const { isAdmin } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [banks, setBanks] = useState<Database['public']['Tables']['banks']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();

    const channel = supabase
      .channel('approvals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, loadData)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [usersRes, banksRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*, bank:bank_id(id, name, code)')
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: true }),
        supabase
          .from('banks')
          .select('*')
          .eq('active', true)
          .order('name')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (banksRes.error) throw banksRes.error;

      setPendingUsers(usersRes.data as UserProfile[]);
      setBanks(banksRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser || !selectedBank) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: 'active',
          bank_id: selectedBank,
          region: selectedRegion || null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setSelectedUser(null);
      setSelectedBank('');
      setSelectedRegion('');
      loadData();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? They will need to re-register.')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: 'inactive',
        })
        .eq('id', userId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please try again.');
    } finally {
      setActionLoading(false);
    }
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600 mt-2">Review and approve new engineer accounts</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No pending approvals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {user.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Registered: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              {selectedUser?.id === user.id ? (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Bank <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      required
                    >
                      <option value="">Select a bank...</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name} ({bank.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region (Optional)
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      <option value="">No region</option>
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="Central">Central</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={!selectedBank || actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                    >
                      {actionLoading ? 'Approving...' : 'Confirm Approval'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setSelectedBank('');
                        setSelectedRegion('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <UserCheck className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                  >
                    <UserX className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
