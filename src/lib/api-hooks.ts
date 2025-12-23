import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './database.types';

// Type aliases for cleaner code
type Device = Database['public']['Tables']['devices']['Row'];
type Call = Database['public']['Tables']['calls']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type StockAlert = Database['public']['Tables']['stock_alerts']['Row'];
type Bank = Database['public']['Tables']['banks']['Row'];

// Extended types with relations - use 'name' and 'code' (actual DB column names)
interface DeviceWithBank extends Device {
  banks: Pick<Bank, 'id' | 'name' | 'code'> | null;
}

interface CallWithRelations extends Call {
  banks: Pick<Bank, 'id' | 'name' | 'code'> | null;
  user_profiles: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null;
}

interface EngineerWithAggregates extends UserProfile {
  banks: Pick<Bank, 'id' | 'name' | 'code'> | null;
}

// API Error interface
export interface ApiError {
  error: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

/**
 * Sanitize search input to prevent query injection attacks
 * Escapes special PostgREST characters and limits length
 */
function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  // Remove or escape special PostgREST filter characters
  // These characters have special meaning in PostgREST filters: .,()%*
  const sanitized = input
    .replace(/[%*]/g, '') // Remove wildcards (we add our own)
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/\./g, ' ')  // Replace dots with spaces
    .trim()
    .slice(0, 100); // Limit length to prevent abuse
  return sanitized;
}

// Dashboard data interface
interface DashboardKPIs {
  totalDevices: number;
  warehouseDevices: number;
  issuedDevices: number;
  installedDevices: number;
  faultyDevices: number;
  pendingCalls: number;
  assignedCalls: number;
  inProgressCalls: number;
  completedCallsToday: number;
}

interface DashboardData {
  kpis: DashboardKPIs;
  recentAlerts: StockAlert[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Helper function to call edge functions with improved error handling
async function callEdgeFunction<T>(
  functionName: string,
  payload?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw { error: 'Not authenticated', error_code: 'AUTH_REQUIRED' } as ApiError;
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && payload) {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);

    // Handle specific HTTP status codes
    if (response.status === 501) {
      throw {
        error: `Edge function '${functionName}' not deployed. Please deploy edge functions first.`,
        error_code: 'FUNCTION_NOT_DEPLOYED',
      } as ApiError;
    }

    if (response.status === 404) {
      throw {
        error: `Edge function '${functionName}' not found.`,
        error_code: 'FUNCTION_NOT_FOUND',
      } as ApiError;
    }

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch {
      // Response wasn't JSON
      if (!response.ok) {
        throw {
          error: `Edge function returned status ${response.status}`,
          error_code: 'FUNCTION_ERROR',
        } as ApiError;
      }
      return {} as T;
    }

    if (!response.ok) {
      throw {
        error: data?.error || data?.message || `Request failed with status ${response.status}`,
        error_code: data?.error_code || 'REQUEST_FAILED',
        details: data,
      } as ApiError;
    }

    return data;
  } catch (err) {
    // Network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw {
        error: 'Network error. Please check your internet connection.',
        error_code: 'NETWORK_ERROR',
      } as ApiError;
    }
    // Re-throw ApiError
    if ((err as ApiError).error_code) {
      throw err;
    }
    // Unknown error
    throw {
      error: err instanceof Error ? err.message : 'Unknown error',
      error_code: 'UNKNOWN_ERROR',
    } as ApiError;
  }
}

// ============================================
// MUTATION HOOKS (for edge function calls)
// ============================================

interface AssignCallsPayload {
  call_ids: string[];
  weight_overrides?: {
    proximity?: number;
    priority?: number;
    workload?: number;
    stock?: number;
  };
  dry_run?: boolean;
  force_reassign?: boolean;
  [key: string]: unknown;
}

export function useAssignCalls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const assignCalls = async (payload: AssignCallsPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<unknown>('assign-calls', payload);
      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { assignCalls, loading, error };
}

interface SubmitCompletionPayload {
  call_id: string;
  resolution_notes: string;
  actual_duration_minutes: number;
  completion_timestamp: string;
  completion_gps?: { latitude: number; longitude: number };
  merchant_rating?: number;
  devices: Array<{
    device_id: string;
    serial_number: string;
    action: 'install' | 'swap_in' | 'swap_out' | 'remove' | 'inspect';
    notes?: string;
  }>;
  photo_urls?: string[];
  idempotency_key?: string;
  [key: string]: unknown;
}

export function useSubmitCallCompletion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submitCompletion = async (payload: SubmitCompletionPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<unknown>('submit-call-completion', payload);
      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { submitCompletion, loading, error };
}

interface IssueDevicesPayload {
  deviceIds: string[];
  engineerId: string;
  notes?: string;
  idempotency_key?: string;
  [key: string]: unknown;
}

export function useIssueDevices() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const issueDevices = async (payload: IssueDevicesPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<unknown>('issue-device-to-engineer', payload);
      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { issueDevices, loading, error };
}

interface MarkFaultyPayload {
  deviceId: string;
  faultDescription: string;
  faultCategory: 'Hardware' | 'Software' | 'Physical Damage' | 'Other';
  severity: 'minor' | 'major' | 'critical';
  requiresRepair?: boolean;
  estimatedCost?: number;
  createSwapCall?: boolean;
  [key: string]: unknown;
}

export function useMarkDeviceFaulty() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const markFaulty = async (payload: MarkFaultyPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<unknown>('mark-device-faulty', payload);
      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { markFaulty, loading, error };
}

interface SwapDevicePayload {
  call_id: string;
  old_device_id: string;
  new_device_id: string;
  swap_reason: string;
  photo_ids: string[];
  completed_at?: string;
  [key: string]: unknown;
}

export function useSwapDevice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const swapDevice = async (payload: SwapDevicePayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<unknown>('swap-device', payload);
      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { swapDevice, loading, error };
}

interface ReconciliationParams {
  bankId?: string;
  startDate?: string;
  endDate?: string;
  includeMovements?: boolean;
}

export function useReconciliationExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const exportReconciliation = async (params?: ReconciliationParams) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params?.bankId) queryParams.set('bankId', params.bankId);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      if (params?.includeMovements) queryParams.set('includeMovements', 'true');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${SUPABASE_URL}/functions/v1/reconciliation-export?${queryParams}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) throw result;

      setLoading(false);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw err;
    }
  };

  return { exportReconciliation, loading, error };
}

// ============================================
// QUERY HOOKS (for data fetching)
// ============================================

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, callsRes, alertsRes] = await Promise.all([
          supabase.from('devices').select('status, device_bank'),
          supabase.from('calls').select('status, priority, created_at'),
          supabase.from('stock_alerts').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

        const devicesByStatus = devicesRes.data?.reduce<Record<string, number>>((acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {}) || {};

        const callsByStatus = callsRes.data?.reduce<Record<string, number>>((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}) || {};

        const completedToday = callsRes.data?.filter((c) => {
          const createdAt = new Date(c.created_at);
          const today = new Date();
          return c.status === 'completed' &&
                 createdAt.toDateString() === today.toDateString();
        }).length || 0;

        setData({
          kpis: {
            totalDevices: devicesRes.data?.length || 0,
            warehouseDevices: devicesByStatus.warehouse || 0,
            issuedDevices: devicesByStatus.issued || 0,
            installedDevices: devicesByStatus.installed || 0,
            faultyDevices: devicesByStatus.faulty || 0,
            pendingCalls: callsByStatus.pending || 0,
            assignedCalls: callsByStatus.assigned || 0,
            inProgressCalls: callsByStatus.in_progress || 0,
            completedCallsToday: completedToday,
          },
          recentAlerts: alertsRes.data || [],
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    fetchData();

    const devicesSubscription = supabase
      .channel('dashboard-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchData();
      })
      .subscribe();

    const callsSubscription = supabase
      .channel('dashboard-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      devicesSubscription.unsubscribe();
      callsSubscription.unsubscribe();
    };
  }, []);

  return { data, loading, error };
}

interface CallFilters {
  status?: string;
  priority?: string;
  bank?: string;
  engineer?: string;
}

export function useCalls(filters?: CallFilters) {
  const [data, setData] = useState<CallWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        let query = supabase
          .from('calls')
          .select('*, banks!client_bank(id, name, code), user_profiles!assigned_engineer(id, full_name, email)')
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status as Database['public']['Tables']['calls']['Row']['status']);
        }
        if (filters?.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority as Database['public']['Tables']['calls']['Row']['priority']);
        }
        if (filters?.bank && filters.bank !== 'all') {
          query = query.eq('client_bank', filters.bank);
        }
        if (filters?.engineer && filters.engineer !== 'all') {
          query = query.eq('assigned_engineer', filters.engineer);
        }

        const { data: callData, error: callError } = await query;
        if (callError) throw callError;
        setData((callData || []) as unknown as CallWithRelations[]);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    fetchCalls();

    const subscription = supabase
      .channel('calls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        fetchCalls();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filters?.status, filters?.priority, filters?.bank, filters?.engineer]);

  return { data, loading, error };
}

interface DeviceFilters {
  status?: string;
  bank?: string;
  assignedTo?: string;
  search?: string;
}

export function useDevices(filters?: DeviceFilters) {
  const [data, setData] = useState<DeviceWithBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('devices')
        .select('*, banks!device_bank(id, name, code)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as Database['public']['Tables']['devices']['Row']['status']);
      }
      if (filters?.bank && filters.bank !== 'all') {
        query = query.eq('device_bank', filters.bank);
      }
      if (filters?.assignedTo && filters.assignedTo !== 'all') {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.search) {
        const sanitizedSearch = sanitizeSearchInput(filters.search);
        if (sanitizedSearch) {
          query = query.or(`serial_number.ilike.%${sanitizedSearch}%,model.ilike.%${sanitizedSearch}%`);
        }
      }

      const { data: deviceData, error: deviceError } = await query;
      if (deviceError) throw deviceError;
      setData((deviceData || []) as unknown as DeviceWithBank[]);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    const subscription = supabase
      .channel('devices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filters?.status, filters?.bank, filters?.assignedTo, filters?.search, refetchTrigger]);

  const refetch = () => setRefetchTrigger(t => t + 1);

  return { data, loading, error, refetch };
}

export function useEngineers() {
  const [data, setData] = useState<EngineerWithAggregates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*, banks!bank_id(id, name, code)')
          .eq('role', 'engineer')
          .order('full_name');

        if (error) throw error;
        setData((data as EngineerWithAggregates[]) || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    fetchEngineers();

    const subscription = supabase
      .channel('engineers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        fetchEngineers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { data, loading, error };
}

export function useAlerts() {
  const [data, setData] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('stock_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setData(data || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    fetchAlerts();

    const subscription = supabase
      .channel('alerts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { data, loading, error };
}

// ============================================
// REACT QUERY HOOKS (optional, for components that want caching)
// ============================================

export function useDevicesQuery(filters?: DeviceFilters) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: async () => {
      let query = supabase
        .from('devices')
        .select('*, banks!device_bank(id, name, code)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as Database['public']['Tables']['devices']['Row']['status']);
      }
      if (filters?.bank && filters.bank !== 'all') {
        query = query.eq('device_bank', filters.bank);
      }
      if (filters?.assignedTo && filters.assignedTo !== 'all') {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.search) {
        const sanitizedSearch = sanitizeSearchInput(filters.search);
        if (sanitizedSearch) {
          query = query.or(`serial_number.ilike.%${sanitizedSearch}%,model.ilike.%${sanitizedSearch}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DeviceWithBank[];
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCallsQuery(filters?: CallFilters) {
  return useQuery({
    queryKey: ['calls', filters],
    queryFn: async () => {
      let query = supabase
        .from('calls')
        .select('*, banks!client_bank(id, name, code), user_profiles!assigned_engineer(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as Database['public']['Tables']['calls']['Row']['status']);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority as Database['public']['Tables']['calls']['Row']['priority']);
      }
      if (filters?.bank && filters.bank !== 'all') {
        query = query.eq('client_bank', filters.bank);
      }
      if (filters?.engineer && filters.engineer !== 'all') {
        query = query.eq('assigned_engineer', filters.engineer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CallWithRelations[];
    },
    staleTime: 30000,
  });
}


// ============================================
// PHASE 2: EXPENSE TRACKING HOOKS
// ============================================

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseType = Database['public']['Tables']['expense_types']['Row'];
type ProblemCode = Database['public']['Tables']['problem_codes']['Row'];

export function useExpenses(engineerId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        let query = supabase.from('expenses').select('*');
        
        if (engineerId) {
          query = query.eq('engineer_id', engineerId);
        }
        
        const { data, error: supabaseError } = await query.order('created_at', { ascending: false });
        
        if (supabaseError) throw supabaseError;
        setExpenses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [engineerId]);

  const submitExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense }])
      .select();
    
    if (error) throw error;
    
    if (data) {
      setExpenses([data[0], ...expenses]);
    }
    
    return data?.[0];
  };

  return { expenses, loading, error, submitExpense };
}

export function useExpenseTypes() {
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('expense_types')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        setTypes(data || []);
      } catch (err) {
        console.error('Error fetching expense types:', err);
        setTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { types, loading };
}

export function useProblemCodes() {
  const [codes, setCodes] = useState<ProblemCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const { data, error } = await supabase
          .from('problem_codes')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('code');
        
        if (error) throw error;
        setCodes(data || []);
      } catch (err) {
        console.error('Error fetching problem codes:', err);
        setCodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCodes();
  }, []);

  return { codes, loading };
}
