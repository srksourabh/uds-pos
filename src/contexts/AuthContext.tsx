import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Test accounts for development/testing - bypasses Supabase auth
const TEST_ACCOUNTS: Record<string, { password: string; user: Partial<User>; profile: UserProfile }> = {
  'admin@uds.com': {
    password: 'admin123',
    user: {
      id: 'test-admin-uuid-0001',
      email: 'admin@uds.com',
      role: 'authenticated',
      aud: 'authenticated',
    } as Partial<User>,
    profile: {
      id: 'test-admin-uuid-0001',
      email: 'admin@uds.com',
      full_name: 'Test Admin',
      phone: '+1234567890',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as UserProfile,
  },
  'engineer@uds.com': {
    password: 'engineer123',
    user: {
      id: 'test-engineer-uuid-0002',
      email: 'engineer@uds.com',
      role: 'authenticated',
      aud: 'authenticated',
    } as Partial<User>,
    profile: {
      id: 'test-engineer-uuid-0002',
      email: 'engineer@uds.com',
      full_name: 'Test Engineer',
      phone: '+1234567891',
      role: 'engineer',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as UserProfile,
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
  isAdmin: boolean;
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
    // Check for stored test user first
    const storedTestUser = localStorage.getItem('test_user');
    if (storedTestUser) {
      try {
        const testAccount = JSON.parse(storedTestUser);
        console.log('Restoring test user session:', testAccount.user.email);
        setUser(testAccount.user as User);
        setProfile(testAccount.profile);
        setSession({ user: testAccount.user } as Session);
        setLoading(false);
        return; // Don't check Supabase session if test user exists
      } catch (e) {
        console.error('Failed to parse stored test user:', e);
        localStorage.removeItem('test_user');
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
      if (localStorage.getItem('test_user')) {
        return;
      }
      (() => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    // Skip loading for test accounts - profile is already set from localStorage
    if (localStorage.getItem('test_user')) {
      console.log('Skipping profile load for test account');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading profile for user:', userId);

      // Try direct query first (simpler, works if RLS allows self-access)
      const { data: directData, error: directError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!directError && directData) {
        console.log('Profile loaded via direct query:', directData);
        setProfile(directData);
        return;
      }

      // If direct query fails, try RPC function
      if (directError) {
        console.log('Direct query failed, trying RPC:', directError.message);

        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile');

          if (!rpcError && rpcData) {
            const profileData = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            console.log('Profile loaded via RPC:', profileData);
            setProfile(profileData || null);
            return;
          }

          if (rpcError) {
            console.log('RPC also failed:', rpcError.message);
          }
        } catch {
          console.log('RPC function may not exist');
        }
      }

      // No profile found - this is OK for new users
      console.log('No profile found for user - will redirect to profile setup');
      setProfile(null);
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    // Check for test accounts first
    const testAccount = TEST_ACCOUNTS[email.toLowerCase()];
    if (testAccount && testAccount.password === password) {
      console.log('Using test account:', email);
      // Store test session in localStorage for persistence
      localStorage.setItem('test_user', JSON.stringify(testAccount));
      setUser(testAccount.user as User);
      setProfile(testAccount.profile);
      setSession({ user: testAccount.user } as Session);
      setLoading(false);
      return;
    }

    // If test account credentials don't match, try Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: true,
      }
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
    // Clear test user if present
    localStorage.removeItem('test_user');

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const reloadProfile = async () => {
    // Skip reload for test accounts - profile is already set
    if (localStorage.getItem('test_user')) {
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
    isAdmin: profile?.role === 'admin',
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
