/**
 * Assignment Engine Utilities
 *
 * Core scoring logic for call assignment optimization.
 * This module can be used both client-side and in edge functions.
 */

export interface Call {
  id: string;
  call_number: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_bank: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Engineer {
  id: string;
  name: string;
  bank_id: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  active_calls_count: number;
  current_device_count: number;
}

export interface AssignmentWeights {
  proximity: number;
  priority: number;
  workload: number;
  stock: number;
}

export interface ScoredEngineer {
  engineer: Engineer;
  proximityScore: number;
  priorityScore: number;
  workloadScore: number;
  stockScore: number;
  totalScore: number;
  distance: number | null;
}

export const DEFAULT_WEIGHTS: AssignmentWeights = {
  proximity: 0.35,
  priority: 0.25,
  workload: 0.20,
  stock: 0.20,
};

export const PRIORITY_VALUES: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/**
 * Calculate the distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Score a single engineer for a call
 */
export function scoreEngineer(
  call: Call,
  engineer: Engineer,
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): ScoredEngineer {
  const distance = calculateDistance(
    engineer.latitude,
    engineer.longitude,
    call.latitude,
    call.longitude
  );

  // Proximity score: closer is better (max 100km radius)
  const proximityScore = distance !== null
    ? Math.max(0, (1 - distance / 100)) * 100
    : 50; // Default score if location unknown

  // Priority score: higher priority = higher score
  const priorityValue = PRIORITY_VALUES[call.priority] || 1;
  const priorityScore = (priorityValue / 4) * 100;

  // Workload score: fewer active calls = higher score
  const workloadScore = Math.max(0, (1 - engineer.active_calls_count / 10)) * 100;

  // Stock score: more devices = higher score
  const stockScore = Math.min(engineer.current_device_count / 10, 1) * 100;

  // Calculate weighted total score
  const totalScore = (
    proximityScore * weights.proximity +
    priorityScore * weights.priority +
    workloadScore * weights.workload +
    stockScore * weights.stock
  );

  return {
    engineer,
    proximityScore,
    priorityScore,
    workloadScore,
    stockScore,
    totalScore,
    distance,
  };
}

/**
 * Rank all eligible engineers for a call
 */
export function rankEngineers(
  call: Call,
  engineers: Engineer[],
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): ScoredEngineer[] {
  // Filter engineers by bank
  const eligible = engineers.filter(
    eng => eng.bank_id === call.client_bank && eng.is_active
  );

  // Score each engineer
  const scored = eligible.map(eng => scoreEngineer(call, eng, weights));

  // Sort by total score (highest first)
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get the best engineer for a call
 */
export function getBestEngineer(
  call: Call,
  engineers: Engineer[],
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): ScoredEngineer | null {
  const ranked = rankEngineers(call, engineers, weights);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Validate weights sum to 1.0
 */
export function validateWeights(weights: AssignmentWeights): boolean {
  const sum = weights.proximity + weights.priority + weights.workload + weights.stock;
  return Math.abs(sum - 1.0) < 0.01;
}

/**
 * Assign multiple calls to engineers using greedy algorithm
 */
export function assignCalls(
  calls: Call[],
  engineers: Engineer[],
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): {
  assignments: Array<{ call: Call; engineer: ScoredEngineer }>;
  unassigned: Array<{ call: Call; reason: string }>;
} {
  const assignments: Array<{ call: Call; engineer: ScoredEngineer }> = [];
  const unassigned: Array<{ call: Call; reason: string }> = [];

  // Track engineer utilization
  const engineerLoads = new Map<string, number>();
  engineers.forEach(eng => engineerLoads.set(eng.id, eng.active_calls_count));

  // Sort calls by priority (urgent first)
  const sortedCalls = [...calls].sort((a, b) => {
    return (PRIORITY_VALUES[b.priority] || 0) - (PRIORITY_VALUES[a.priority] || 0);
  });

  for (const call of sortedCalls) {
    // Update engineer active calls count with current assignments
    const updatedEngineers = engineers.map(eng => ({
      ...eng,
      active_calls_count: engineerLoads.get(eng.id) || eng.active_calls_count,
    }));

    const best = getBestEngineer(call, updatedEngineers, weights);

    if (!best) {
      unassigned.push({
        call,
        reason: 'No eligible engineers available',
      });
      continue;
    }

    assignments.push({ call, engineer: best });

    // Update engineer load
    const currentLoad = engineerLoads.get(best.engineer.id) || 0;
    engineerLoads.set(best.engineer.id, currentLoad + 1);
  }

  return { assignments, unassigned };
}
