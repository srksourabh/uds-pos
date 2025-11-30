import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface ApiError {
  error: string;
  error_code?: string;
  details?: any;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction<T>(
  functionName: string,
  payload?: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
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

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function useAssignCalls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const assignCalls = async (payload: {
    call_ids: string[];
    weight_overrides?: {
      proximity?: number;
      priority?: number;
      workload?: number;
      stock?: number;
    };
    dry_run?: boolean;
    force_reassign?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction('assign-calls', payload);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { assignCalls, loading, error };
}

export function useSubmitCallCompletion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submitCompletion = async (payload: {
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
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction('submit-call-completion', payload);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { submitCompletion, loading, error };
}

export function useIssueDevices() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const issueDevices = async (payload: {
    deviceIds: string[];
    engineerId: string;
    notes?: string;
    idempotency_key?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction('issue-device-to-engineer', payload);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { issueDevices, loading, error };
}

export function useMarkDeviceFaulty() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const markFaulty = async (payload: {
    deviceId: string;
    faultDescription: string;
    faultCategory: 'Hardware' | 'Software' | 'Physical Damage' | 'Other';
    severity: 'minor' | 'major' | 'critical';
    requiresRepair?: boolean;
    estimatedCost?: number;
    createSwapCall?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction('mark-device-faulty', payload);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { markFaulty, loading, error };
}

export function useSwapDevice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const swapDevice = async (payload: {
    call_id: string;
    old_device_id: string;
    new_device_id: string;
    swap_reason: string;
    photo_ids: string[];
    completed_at?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction('swap-device', payload);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { swapDevice, loading, error };
}

export function useReconciliationExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const exportReconciliation = async (params?: {
    bankId?: string;
    startDate?: string;
    endDate?: string;
    includeMovements?: boolean;
  }) => {
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
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { exportReconciliation, loading, error };
}

export function useDashboardData() {
  const [data, setData] = useState<any>(null);
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

        const devicesByStatus = devicesRes.data?.reduce((acc: any, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {});

        const callsByStatus = callsRes.data?.reduce((acc: any, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {});

        const completedToday = callsRes.data?.filter((c: any) => {
          const createdAt = new Date(c.created_at);
          const today = new Date();
          return c.status === 'completed' &&
                 createdAt.toDateString() === today.toDateString();
        }).length || 0;

        setData({
          kpis: {
            totalDevices: devicesRes.data?.length || 0,
            warehouseDevices: devicesByStatus?.warehouse || 0,
            issuedDevices: devicesByStatus?.issued || 0,
            installedDevices: devicesByStatus?.installed || 0,
            faultyDevices: devicesByStatus?.faulty || 0,
            pendingCalls: callsByStatus?.pending || 0,
            assignedCalls: callsByStatus?.assigned || 0,
            inProgressCalls: callsByStatus?.in_progress || 0,
            completedCallsToday: completedToday,
          },
          recentAlerts: alertsRes.data || [],
        });
        setLoading(false);
      } catch (err: any) {
        setError(err);
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

export function useCalls(filters?: {
  status?: string;
  priority?: string;
  bank?: string;
  engineer?: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        let query = supabase
          .from('calls')
          .select('*, banks(bank_code, bank_name), user_profiles(full_name, email)')
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority);
        }
        if (filters?.bank && filters.bank !== 'all') {
          query = query.eq('client_bank', filters.bank);
        }
        if (filters?.engineer && filters.engineer !== 'all') {
          query = query.eq('assigned_engineer', filters.engineer);
        }

        const { data, error } = await query;
        if (error) throw error;
        setData(data || []);
        setLoading(false);
      } catch (err: any) {
        setError(err);
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

export function useDevices(filters?: {
  status?: string;
  bank?: string;
  assignedTo?: string;
  search?: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        let query = supabase
          .from('devices')
          .select('*, banks(bank_code, bank_name)')
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.bank && filters.bank !== 'all') {
          query = query.eq('device_bank', filters.bank);
        }
        if (filters?.assignedTo && filters.assignedTo !== 'all') {
          query = query.eq('assigned_to', filters.assignedTo);
        }
        if (filters?.search) {
          query = query.or(`serial_number.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setData(data || []);
        setLoading(false);
      } catch (err: any) {
        setError(err);
        setLoading(false);
      }
    };

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
  }, [filters?.status, filters?.bank, filters?.assignedTo, filters?.search]);

  return { data, loading, error };
}

export function useEngineers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*, banks(bank_code, bank_name), engineer_aggregates(*)')
          .eq('role', 'engineer')
          .order('full_name');

        if (error) throw error;
        setData(data || []);
        setLoading(false);
      } catch (err: any) {
        setError(err);
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
  const [data, setData] = useState<any[]>([]);
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
      } catch (err: any) {
        setError(err);
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
