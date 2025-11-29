export interface AssignCallsRequest {
  call_ids: string[];
  assignment_mode?: 'auto' | 'manual' | 'bulk';
  force_reassign?: boolean;
  weight_overrides?: {
    proximity?: number;
    priority?: number;
    workload?: number;
    stock?: number;
  };
  dry_run?: boolean;
  actor_id?: string;
}

export interface AssignCallsResponse {
  success: boolean;
  assignments: Assignment[];
  unassigned: UnassignedCall[];
  statistics: AssignmentStatistics;
  errors?: AssignmentError[];
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
  distance_km?: number;
  estimated_travel_time_minutes?: number;
  stock_available: number;
  reason: string;
  assigned_at: string;
}

export interface UnassignedCall {
  call_id: string;
  call_number: string;
  reason: 'no_eligible_engineers' | 'no_stock' | 'no_engineers_in_bank' | 'validation_failed';
  details: string;
  eligible_count: number;
  considered_count: number;
}

export interface AssignmentStatistics {
  total_calls: number;
  assigned_count: number;
  unassigned_count: number;
  avg_score: number;
  avg_distance_km: number;
  execution_time_ms: number;
  engineers_utilized: number;
}

export interface AssignmentError {
  call_id: string;
  error_code: string;
  message: string;
}

export interface Engineer {
  id: string;
  full_name: string;
  email: string;
  bank_id: string;
  region: string | null;
  skills: any;
  status: string;
  last_location_lat: number | null;
  last_location_lng: number | null;
  last_location_updated_at: string | null;
  stock_count_by_bank: Record<string, number> | null;
  active_calls_count: number;
  last_assignment_at: string | null;
}

export interface Call {
  id: string;
  call_number: string;
  type: 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown';
  status: string;
  client_bank: string;
  client_name: string;
  client_address: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  created_at: string;
}