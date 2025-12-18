import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, AlertCircle, Smartphone, Mail, ArrowLeft, Copy, Check } from 'lucide-react';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
        setError('Please enter a valid phone number with country code (e.g., +919876543210)');
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
            <h1 className="heading-1-responsive text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">Field Service Management</p>
          </div>

          {error && (
            <div className="mb-responsive p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="form-label-responsive">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="admin@uds.com"
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
                <label htmlFor="phone" className="form-label-responsive">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="+919876543210"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Include country code (e.g., +91 for India)
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
                <label htmlFor="otp" className="form-label-responsive">
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
                  Sign in with email (All Users)
                </>
              )}
            </button>
          </div>

          {/* Test Credentials - Production Accounts */}
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm font-bold text-blue-900 mb-3 text-center flex items-center justify-center gap-2">
              🔑 Test Account Credentials
            </p>
            
            <div className="space-y-3">
              {/* Super Admin */}
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  SUPER ADMIN
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Email:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded font-mono">super@uds.com</code>
                      <button
                        onClick={() => handleCopy('super@uds.com', 'super-email')}
                        className="p-1 hover:bg-purple-100 rounded transition"
                        title="Copy email"
                      >
                        {copiedField === 'super-email' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Password:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded font-mono">Super@123</code>
                      <button
                        onClick={() => handleCopy('Super@123', 'super-pass')}
                        className="p-1 hover:bg-purple-100 rounded transition"
                        title="Copy password"
                      >
                        {copiedField === 'super-pass' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  ADMIN
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Email:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded font-mono">admin@uds.com</code>
                      <button
                        onClick={() => handleCopy('admin@uds.com', 'admin-email')}
                        className="p-1 hover:bg-blue-100 rounded transition"
                        title="Copy email"
                      >
                        {copiedField === 'admin-email' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Password:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded font-mono">Admin@123</code>
                      <button
                        onClick={() => handleCopy('Admin@123', 'admin-pass')}
                        className="p-1 hover:bg-blue-100 rounded transition"
                        title="Copy password"
                      >
                        {copiedField === 'admin-pass' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engineer */}
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  FIELD ENGINEER
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Email:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded font-mono">engineer@uds.com</code>
                      <button
                        onClick={() => handleCopy('engineer@uds.com', 'engineer-email')}
                        className="p-1 hover:bg-green-100 rounded transition"
                        title="Copy email"
                      >
                        {copiedField === 'engineer-email' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 font-medium">Password:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded font-mono">Engineer@123</code>
                      <button
                        onClick={() => handleCopy('Engineer@123', 'engineer-pass')}
                        className="p-1 hover:bg-green-100 rounded transition"
                        title="Copy password"
                      >
                        {copiedField === 'engineer-pass' ? 
                          <Check className="w-3 h-3 text-green-600" /> : 
                          <Copy className="w-3 h-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic mt-1">
                    Or use phone: +919876543210 with OTP
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-[10px] text-center text-gray-500">
                💡 Click copy icons to copy credentials • Passwords updated in database
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
