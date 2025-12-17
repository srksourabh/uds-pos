import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Check if test accounts are enabled
// NOTE: Enabled on localhost, Vercel previews (*.vercel.app), or with explicit env var
// SECURITY: For true production, use a custom domain to disable test accounts
const TEST_ACCOUNTS_ENABLED = (
  // Development mode (localhost)
  import.meta.env.DEV ||
  window.location.hostname === 'localhost' ||
  // Vercel preview/development deployments (for team testing)
  window.location.hostname.endsWith('.vercel.app') ||
  // Explicit enable via environment variable (non-production only)
  (!import.meta.env.PROD && import.meta.env.VITE_ENABLE_TEST_ACCOUNTS === 'true')
);

// Debug logging helper - only logs in development
const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[Auth]', ...args);
  }
};

// Create a complete test profile with all required fields
const createTestProfile = (overrides: Partial<UserProfile>): UserProfile => ({
  id: '',
  email: '',
  full_name: '',
  phone: null,
  role: 'engineer',
  bank_id: null,
  region: null,
  skills: {},
  status: 'active',
  avatar_url: null,
  last_location_lat: null,
  last_location_lng: null,
  last_location_updated_at: null,
  totp_enabled: false,
  metadata: {},
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Simple test accounts for easy testing
// Login with: super / super  OR  admin / admin  OR  engineer / engineer
const TEST_ACCOUNTS: Record<string, { password: string; user: Partial<User>; profile: UserProfile }> = {
  'admin': {
    password: 'admin',
    user: {
      id: 'test-admin-uuid-0001',
      email: 'admin@uds.com',
      role: 'authenticated',
      aud: 'authenticated',
    } as Partial<User>,
    profile: createTestProfile({
      id: 'test-admin-uuid-0001',
      email: 'admin@uds.com',
      full_name: 'Admin User',
      phone: '+1234567890',
      role: 'admin',
    }),
  },
  'engineer': {
    password: 'engineer',
    user: {
      id: 'test-engineer-uuid-0002',
      email: 'engineer@uds.com',
      role: 'authenticated',
      aud: 'authenticated',
    } as Partial<User>,
    profile: createTestProfile({
      id: 'test-engineer-uuid-0002',
      email: 'engineer@uds.com',
      full_name: 'Test Engineer',
      phone: '+1234567891',
      role: 'engineer',
    }),
  },
  'super': {
    password: 'super',
    user: {
      id: 'test-super-uuid-0003',
      email: 'super@uds.com',
      role: 'authenticated',
      aud: 'authenticated',
    } as Partial<User>,
    profile: createTestProfile({
      id: 'test-super-uuid-0003',
      email: 'super@uds.com',
      full_name: 'Super Admin',
      phone: '+1234567892',
      role: 'super_admin',
    }),
  },
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCallManager: boolean;
  isStockManager: boolean;
  isEngineer: boolean;
  isActive: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored test user first (only if test accounts are enabled)
    if (TEST_ACCOUNTS_ENABLED) {
      const storedTestUser = localStorage.getItem('test_user');
      if (storedTestUser) {
        try {
          const testAccount = JSON.parse(storedTestUser);
          debugLog('Restoring test user session:', testAccount.user.email);
          setUser(testAccount.user as User);
          setProfile(testAccount.profile);
          setSession({ user: testAccount.user } as Session);
          setLoading(false);
          return; // Don't check Supabase session if test user exists
        } catch (e) {
          debugLog('Failed to parse stored test user:', e);
          localStorage.removeItem('test_user');
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't override test user session
      if (TEST_ACCOUNTS_ENABLED && localStorage.getItem('test_user')) {
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    // Skip loading for test accounts - profile is already set from localStorage
    if (TEST_ACCOUNTS_ENABLED && localStorage.getItem('test_user')) {
      debugLog('Skipping profile load for test account');
      setLoading(false);
      return;
    }

    try {
      debugLog('Loading profile for user:', userId);

      // Try direct query first (simpler, works if RLS allows self-access)
      const { data: directData, error: directError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!directError && directData) {
        debugLog('Profile loaded via direct query');
        setProfile(directData);
        return;
      }

      // If direct query fails, try RPC function
      if (directError) {
        debugLog('Direct query failed, trying RPC:', directError.message);

        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile');

          if (!rpcError && rpcData) {
            const profileData = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            debugLog('Profile loaded via RPC');
            setProfile(profileData || null);
            return;
          }

          if (rpcError) {
            debugLog('RPC also failed:', rpcError.message);
          }
        } catch {
          debugLog('RPC function may not exist');
        }
      }

      // No profile found - this is OK for new users
      debugLog('No profile found for user - will redirect to profile setup');
      setProfile(null);
    } catch (error) {
      debugLog('Unexpected error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    // Check for test accounts first (only if enabled)
    if (TEST_ACCOUNTS_ENABLED) {
      const testAccount = TEST_ACCOUNTS[email.toLowerCase()];
      if (testAccount && testAccount.password === password) {
        debugLog('Using test account:', email);
        // Store test session in localStorage for persistence
        localStorage.setItem('test_user', JSON.stringify(testAccount));
        setUser(testAccount.user as User);
        setProfile(testAccount.profile);
        setSession({ user: testAccount.user } as Session);
        setLoading(false);
        return;
      }
    }

    // Try Supabase authentication
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (rememberMe) {
      await supabase.auth.updateUser({
        data: { remember_me: true }
      });
    }
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw error;
  };

  const verifyOTP = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) throw error;
  };

  const signOut = async () => {
    try {
      // Clear test user if present
      localStorage.removeItem('test_user');

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear ALL localStorage (removes any cached data)
      localStorage.clear();
      
      // Clear ALL sessionStorage
      sessionStorage.clear();
      
      // Clear React state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Force a hard reload to clear all cached React state and start fresh
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear everything and redirect
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      setSession(null);
      window.location.href = '/';
    }
  };

  const reloadProfile = async () => {
    // Skip reload for test accounts - profile is already set
    if (TEST_ACCOUNTS_ENABLED && localStorage.getItem('test_user')) {
      return;
    }
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signInWithPhone,
    verifyOTP,
    signOut,
    reloadProfile,
    refreshProfile: reloadProfile, // Alias for reloadProfile
    isSuperAdmin: profile?.role === 'super_admin',
    // Admin-level roles can access admin dashboard
    isAdmin: ['super_admin', 'senior_manager', 'manager', 'coordinator', 'stock_coordinator', 'admin'].includes(profile?.role || ''),
    // Can manage calls (allocate, view all)
    isCallManager: ['super_admin', 'senior_manager', 'manager', 'coordinator', 'admin'].includes(profile?.role || ''),
    // Can manage stock
    isStockManager: ['super_admin', 'senior_manager', 'manager', 'stock_coordinator', 'admin'].includes(profile?.role || ''),
    // Is field engineer
    isEngineer: profile?.role === 'engineer',
    isActive: profile?.status === 'active',
    isPending: profile?.status === 'pending_approval',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
