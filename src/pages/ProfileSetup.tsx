import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserCircle, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

// Debug logging helper - only logs in development
const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[ProfileSetup]', ...args);
  }
};

export function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // If we already have a profile loaded, go to dashboard
    if (profile) {
      navigate('/dashboard');
      return;
    }

    // Pre-fill from user auth data
    if (user.phone) {
      setPhone(user.phone);
    }
    if (user.email) {
      setEmail(user.email);
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) throw new Error('Not authenticated');

      // Try upsert_my_profile RPC first (if available)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_my_profile', {
          p_email: email || user.email || `${user.id}@temp.com`,
          p_full_name: fullName,
          p_phone: phone || null,
          p_role: 'engineer',
          p_status: 'pending_approval'
        });

        if (!rpcError && rpcData) {
          debugLog('Profile created via RPC:', rpcData);
          setSuccess(true);
          setTimeout(() => navigate('/pending-approval'), 2000);
          return;
        }

        if (rpcError) {
          debugLog('RPC failed, falling back to direct insert:', rpcError.message);
        }
      } catch {
        debugLog('RPC function may not exist, falling back to direct insert');
      }

      // Fallback: Try upsert directly
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: email || user.email || `${user.id}@temp.com`,
          full_name: fullName,
          phone: phone || null,
          role: 'engineer',
          status: 'pending_approval',
        }, { onConflict: 'id' });

      if (profileError) {
        // 409 conflict means profile exists - try to navigate to dashboard
        if (profileError.code === '23505' || profileError.message?.includes('duplicate') || profileError.message?.includes('conflict')) {
          debugLog('Profile already exists, navigating to dashboard');
          navigate('/dashboard');
          return;
        }
        throw profileError;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/pending-approval');
      }, 2000);

    } catch (err: any) {
      console.error('Profile setup error:', err);

      // If we get any database error, it might be RLS - suggest they may need admin help
      if (err.message?.includes('500') || err.message?.includes('permission') || err.message?.includes('policy')) {
        setError('Database permission error. Please contact an administrator to set up your profile.');
      } else {
        setError(err.message || 'Failed to create profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    navigate('/login');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="bg-green-100 p-3 rounded-full inline-block mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="heading-2-responsive text-gray-900 mb-2">Profile Created!</h2>
            <p className="text-gray-600">
              Redirecting you to the approval status page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-responsive">
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl mb-4">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="heading-1-responsive text-gray-900">Welcome!</h1>
            <p className="text-gray-600 mt-2">Let's set up your profile</p>
          </div>

          {error && (
            <div className="mb-responsive p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="form-label-responsive">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="phone" className="form-label-responsive">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!user?.phone}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">
                {user?.phone ? 'Phone number from authentication' : 'Optional but recommended'}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="form-label-responsive">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="john@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional but recommended for notifications
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating profile...' : 'Create Profile'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Next Steps:</strong> After submitting, your profile will be reviewed by an administrator.
              You'll receive a notification once approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
