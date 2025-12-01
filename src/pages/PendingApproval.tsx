import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export function PendingApproval() {
  const navigate = useNavigate();
  const { profile, signOut, isActive, isPending, loading } = useAuth();

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/login');
    } else if (!loading && isActive) {
      navigate('/dashboard');
    }
  }, [loading, profile, isActive, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isPending) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-yellow-100 p-4 rounded-full mb-4">
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Approval</h1>
            <p className="text-gray-600 text-center">
              Your account is awaiting administrator approval
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-yellow-800 mb-4">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
              <li>An administrator will review your profile</li>
              <li>You'll be assigned to a bank and region</li>
              <li>You'll receive a notification when approved</li>
              <li>Once approved, you can access the full system</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw className="w-5 h-5" />
              Check Status
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

          {profile && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Profile</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {profile.full_name}</p>
                {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
                {profile.phone && <p><strong>Phone:</strong> {profile.phone}</p>}
                <p><strong>Role:</strong> <span className="capitalize">{profile.role}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
