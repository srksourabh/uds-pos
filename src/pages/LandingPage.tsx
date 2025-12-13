import { useNavigate } from 'react-router-dom';
import { Shield, UserCog, Zap } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    // Navigate to login with admin role hint
    navigate('/login?role=admin');
  };

  const handleSuperAdminLogin = () => {
    // Navigate to login with super_admin role hint
    navigate('/login?role=super_admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">UDS Service Portal</h1>
          <p className="text-slate-400">Field Service Management System</p>
        </div>

        {/* Login Buttons */}
        <div className="space-y-4">
          {/* Admin Login Button */}
          <button
            onClick={handleAdminLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/30 active:scale-[0.98]"
          >
            <UserCog className="w-6 h-6" />
            Admin Login
          </button>

          {/* Super Admin Login Button */}
          <button
            onClick={handleSuperAdminLogin}
            className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] border border-slate-600 hover:border-slate-500 active:scale-[0.98]"
          >
            <Shield className="w-6 h-6" />
            Super Admin Login
          </button>
        </div>

        {/* Testing Environment Notice */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">Testing Environment</p>
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-300">Quick Login:</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Admin: <code className="text-blue-400">admin / admin</code>
            </p>
            <p className="text-xs text-slate-500">
              Super Admin: <code className="text-purple-400">super / super</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
