import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, UserCog, Zap, Building2, ChevronRight } from 'lucide-react';

export function LandingPage() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleTestLogin = async (role: 'super' | 'admin' | 'engineer') => {
    try {
      setLoading(role);
      setError('');
      
      // Use the test account credentials
      await signIn(role, role);
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Hard redirect to dashboard (fresh page load with clean state)
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Test login error:', err);
      setError('Login failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="heading-1-responsive text-white mb-2">UDS Service Portal</h1>
          <p className="text-slate-400">Field Service Management System</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Test Login Buttons Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent flex-1"></div>
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">
              Quick Test Login
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent flex-1"></div>
          </div>

          <div className="space-y-3">
            {/* Super Admin Test Button */}
            <button
              onClick={() => handleTestLogin('super')}
              disabled={loading !== null}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-purple-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Super Admin</div>
                  <div className="text-xs text-purple-100 opacity-90">
                    {loading === 'super' ? 'Logging in...' : 'Full system access'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Admin Test Button */}
            <button
              onClick={() => handleTestLogin('admin')}
              disabled={loading !== null}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Admin</div>
                  <div className="text-xs text-blue-100 opacity-90">
                    {loading === 'admin' ? 'Logging in...' : 'Management access'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Engineer Test Button */}
            <button
              onClick={() => handleTestLogin('engineer')}
              disabled={loading !== null}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-green-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Field Engineer</div>
                  <div className="text-xs text-green-100 opacity-90">
                    {loading === 'engineer' ? 'Logging in...' : 'Field operations'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-4">
            ⚠️ Testing mode - These buttons will be removed in production
          </p>
        </div>

        {/* Testing Environment Notice */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm text-center mb-3">
            <span className="font-semibold text-slate-300">Development Mode</span>
          </p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Super Admin:</span>
              <code className="text-purple-400 bg-purple-950/30 px-2 py-1 rounded">super / super</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Admin:</span>
              <code className="text-blue-400 bg-blue-950/30 px-2 py-1 rounded">admin / admin</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Engineer:</span>
              <code className="text-green-400 bg-green-950/30 px-2 py-1 rounded">engineer / engineer</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
