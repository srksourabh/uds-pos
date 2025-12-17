import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Auto-append @uds.com if no @ symbol (for easy testing)
      const loginEmail = email.includes('@') ? email : `${email}@uds.com`;
      await signIn(loginEmail, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="heading-1-responsive text-gray-900">Field Service</h1>
            <p className="text-gray-600 mt-2">POS Device Management</p>
          </div>

          {error && (
            <div className="mb-responsive p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label-responsive">
                Username / Email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label-responsive">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Test Login Buttons */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700 text-center mb-3">Quick Test Login:</p>
            
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await signIn('super@uds.com', 'super');
                  navigate('/dashboard');
                } catch (err) {
                  setError('Login failed');
                } finally {
                  setLoading(false);
                }
              }}
              type="button"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-5 h-5" />
              {loading ? 'Logging in...' : 'Login as Super Admin'}
            </button>
            
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await signIn('admin@uds.com', 'admin');
                  navigate('/dashboard');
                } catch (err) {
                  setError('Login failed');
                } finally {
                  setLoading(false);
                }
              }}
              type="button"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-5 h-5" />
              {loading ? 'Logging in...' : 'Login as Admin'}
            </button>
            
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await signIn('engineer@uds.com', 'engineer');
                  navigate('/dashboard');
                } catch (err) {
                  setError('Login failed');
                } finally {
                  setLoading(false);
                }
              }}
              type="button"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-5 h-5" />
              {loading ? 'Logging in...' : 'Login as Engineer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
