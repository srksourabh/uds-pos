import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, AlertCircle, Smartphone, Mail, ArrowLeft } from 'lucide-react';

type LoginMethod = 'email' | 'phone';
type PhoneStep = 'enter-phone' | 'enter-otp';

export function EnhancedLogin() {
  const navigate = useNavigate();
  const { signIn, signInWithPhone, verifyOTP, user, profile, isPending, isActive, loading: authLoading, reloadProfile } = useAuth();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter-phone');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpResendDisabled, setOtpResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Wait for auth state to be determined before making navigation decisions
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User is logged in with an active profile - go to dashboard
  if (user && profile && isActive) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is pending approval
  if (user && isPending) {
    return <Navigate to="/pending-approval" replace />;
  }

  // User doesn't have a profile yet - go to profile setup
  if (user && !profile) {
    return <Navigate to="/profile-setup" replace />;
  }

  // If user exists but profile is inactive/rejected, show login form
  // (they can sign out or contact admin)

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password, rememberMe);
      await reloadProfile();
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[Login Error]', err);
      const message = err.message?.toLowerCase() || '';

      if (message.includes('invalid login credentials') || message.includes('invalid')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (message.includes('email not confirmed')) {
        setError('Please confirm your email address before logging in.');
      } else if (message.includes('locked') || message.includes('too many')) {
        setError('Too many login attempts. Please wait a few minutes.');
      } else if (message.includes('network') || message.includes('fetch')) {
        setError('Network error. Please check your internet connection.');
      } else if (message.includes('supabase') || message.includes('environment')) {
        setError('Configuration error. Please contact support.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      await signInWithPhone(formattedPhone);
      setPhoneStep('enter-otp');
      startResendCountdown();
    } catch (err: any) {
      if (err.message?.includes('Invalid')) {
        setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      await verifyOTP(formattedPhone, otp);
      navigate('/profile-setup');
    } catch (err: any) {
      if (err.message?.includes('expired')) {
        setError('This code has expired. Please request a new one.');
      } else if (err.message?.includes('Invalid')) {
        setError('Invalid code. Please check and try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpResendDisabled) return;

    setError('');
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      await signInWithPhone(formattedPhone);
      setOtp('');
      startResendCountdown();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendCountdown = () => {
    setOtpResendDisabled(true);
    setCountdown(60);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setOtpResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const switchLoginMethod = () => {
    setLoginMethod(loginMethod === 'email' ? 'phone' : 'email');
    setPhoneStep('enter-phone');
    setError('');
    setEmail('');
    setPassword('');
    setPhone('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">Field Service Management</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Username
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="admin or admin@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700">
                  Remember me for 7 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : phoneStep === 'enter-phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Include country code (e.g., +1 for US)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Sending code...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPVerify} className="space-y-6">
              <button
                type="button"
                onClick={() => setPhoneStep('enter-phone')}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Change phone number
              </button>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the 6-digit code sent to {phone}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="text-center">
                {otpResendDisabled ? (
                  <p className="text-sm text-gray-500">
                    Resend code in {countdown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={switchLoginMethod}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              {loginMethod === 'email' ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  Sign in with phone number (Engineers)
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Sign in with email (Admins)
                </>
              )}
            </button>
          </div>

          {/* Test Credentials Info */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-medium text-slate-600 mb-2">Test Credentials (Dev Mode):</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p><span className="font-medium">Admin:</span> admin / admin</p>
              <p><span className="font-medium">Engineer:</span> test / test</p>
              <p><span className="font-medium">Super Admin:</span> super / super</p>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Or use Supabase accounts: admin@uds.com / Admin@123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
