import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserCog, Zap, Building2, ChevronRight } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

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

        {/* Quick Access Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent flex-1"></div>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">
              Quick Access
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent flex-1"></div>
          </div>

          <div className="space-y-3">
            {/* Super Admin Button */}
            <button
              onClick={() => navigate('/login')}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-purple-600/30 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Super Admin</div>
                  <div className="text-xs text-purple-100 opacity-90">
                    Full system access
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Admin Button */}
            <button
              onClick={() => navigate('/login')}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/30 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Admin</div>
                  <div className="text-xs text-blue-100 opacity-90">
                    Management access
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Engineer Button */}
            <button
              onClick={() => navigate('/login')}
              className="group w-full flex items-center justify-between gap-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-green-600/30 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-bold">Field Engineer</div>
                  <div className="text-xs text-green-100 opacity-90">
                    Field operations
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Test Credentials Info */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <p className="text-slate-300 font-semibold text-sm text-center mb-4">
            🔑 Test Account Credentials
          </p>
          <div className="space-y-3">
            <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">SUPER ADMIN</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Email:</span>
                  <code className="text-purple-300 bg-purple-950/50 px-2 py-1 rounded">super@uds.com</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Password:</span>
                  <code className="text-purple-300 bg-purple-950/50 px-2 py-1 rounded">Super@123</code>
                </div>
              </div>
            </div>

            <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">ADMIN</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Email:</span>
                  <code className="text-blue-300 bg-blue-950/50 px-2 py-1 rounded">admin@uds.com</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Password:</span>
                  <code className="text-blue-300 bg-blue-950/50 px-2 py-1 rounded">Admin@123</code>
                </div>
              </div>
            </div>

            <div className="bg-green-950/30 border border-green-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-300">ENGINEER</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Phone:</span>
                  <code className="text-green-300 bg-green-950/50 px-2 py-1 rounded">+919876543210</code>
                </div>
                <div className="text-slate-500 text-[10px] mt-1">
                  Use phone login with OTP
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-center text-slate-500 text-xs">
              Click any button above to go to login page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
