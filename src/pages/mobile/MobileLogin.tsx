import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

// Debug logging helper - only logs in development
const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[MobileLogin]', ...args);
  }
};

export default function MobileLogin() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      // Auto-append @uds.com if no @ present
      const email = username.includes('@') ? username : `${username}@uds.com`;

      debugLog('Attempting login with email:', email);

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        setError('Invalid username or password');
        return;
      }

      if (!authData.user) {
        setError('Login failed. Please try again.');
        return;
      }

      debugLog('Auth successful, fetching profile...');

      // Fetch user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, status, active')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        await supabase.auth.signOut();
        setError('Unable to fetch user profile');
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        setError('User profile not found');
        return;
      }

      debugLog('Profile fetched:', profile);

      // Check if user is active
      if (!profile.active || profile.status !== 'active') {
        await supabase.auth.signOut();
        setError('Account is inactive or suspended');
        return;
      }

      // Engineers should use mobile interface, admins/super_admins should use web
      if (profile.role === 'engineer') {
        debugLog('Engineer login successful, navigating to mobile dashboard...');
        // Refresh profile and navigate to mobile dashboard
        await refreshProfile();
        navigate('/mobile');
      } else {
        // Admins and Super Admins should use web interface
        await supabase.auth.signOut();
        setError('This login is for field engineers only. Admins should use the web portal.');
        return;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Wrench className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="heading-2-responsive text-gray-900">UDS Service</h1>
              <p className="text-sm text-gray-600">Field Engineer Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="heading-2-responsive text-gray-900 mb-2">
                Engineer Login
              </h2>
              <p className="text-gray-600">
                Enter your credentials to access the system
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="form-label-responsive">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Enter username"
                  disabled={loading}
                  autoComplete="username"
                  autoCapitalize="off"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For test accounts, just enter: engineer
                </p>
              </div>

              <div>
                <label htmlFor="password" className="form-label-responsive">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base pr-12"
                    placeholder="Enter password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-base font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Test Account Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 font-medium mb-2">Test Account:</p>
              <p className="text-xs text-blue-700">
                <strong>Username:</strong> engineer<br />
                <strong>Password:</strong> engineer
              </p>
            </div>

            {/* Admin Portal Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Admin Portal →
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Field Service Management System</p>
            <p className="text-xs mt-1">© 2024 UDS Service. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
