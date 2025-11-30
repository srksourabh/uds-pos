export interface AssignCallsRequest {
  call_ids: string[];
  weight_overrides?: {
    proximity?: number;
    priority?: number;
    workload?: number;
    stock?: number;
  };
  dry_run?: boolean;
  force_reassign?: boolean;
  actor_id?: string;
}

export interface Assignment {
  call_id: string;
  call_number: string;
  assigned_engineer_id: string;
  engineer_name: string;
  score: number;
  score_breakdown: {
    proximity_score: number;
    priority_score: number;
    workload_score: number;
    stock_score: number;
  };
  distance_km: number;
  stock_available: number;
  reason: string;
  assigned_at: string;
}

export interface UnassignedCall {
  call_id: string;
  call_number: string;
  reason: string;
  details: string;
  eligible_count: number;
  considered_count: number;
}

export interface AssignCallsResponse {
  success: boolean;
  assignments: Assignment[];
  unassigned: UnassignedCall[];
  statistics: {
    total_calls: number;
    assigned_count: number;
    unassigned_count: number;
    avg_score: number;
    avg_distance_km: number;
    execution_time_ms: number;
    engineers_utilized: number;
  };
}

export interface Engineer {
  user_id: string;
  full_name: string;
  bank_id: string;
  latitude?: number;
  longitude?: number;
  engineer_aggregates?: Array<{
    current_device_count: number;
    active_calls_count: number;
  }>;
}

export interface Call {
  id: string;
  call_number: string;
  client_bank: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  latitude?: number;
  longitude?: number;
}
