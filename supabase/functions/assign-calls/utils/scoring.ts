import { calculateDistance, REGION_CENTERS } from './geo.ts';
import type { Engineer, Call } from '../types.ts';

const MAX_DISTANCE_KM = 100;
const MAX_CALLS_PER_ENGINEER = 10;
const IDEAL_STOCK_COUNT = 3;
const LOCATION_STALENESS_HOURS = 2;

export function filterEligibleEngineers(
  engineers: Engineer[],
  call: Call,
  stockMap: Map<string, Map<string, number>>
): Engineer[] {
  return engineers.filter(engineer => {
    if (engineer.bank_id !== call.client_bank) return false;
    if (engineer.status !== 'active') return false;

    const requiresDevice = call.type === 'install' || call.type === 'swap';
    if (requiresDevice) {
      const stocks = stockMap.get(engineer.id);
      const stockCount = stocks?.get(call.client_bank) || 0;
      if (stockCount === 0) return false;
    }

    return true;
  });
}

export function calculateScores(
  engineer: Engineer,
  call: Call,
  weights: any,
  workloadMap: Map<string, number>
) {
  const proximityScore = calculateProximityScore(engineer, call);
  const priorityScore = calculatePriorityScore(call);
  const workloadScore = calculateWorkloadScore(engineer, workloadMap);
  const stockScore = calculateStockScore(engineer, call);

  const finalScore =
    proximityScore * weights.proximity +
    priorityScore * weights.priority +
    workloadScore * weights.workload +
    stockScore * weights.stock;

  return {
    final_score: Math.round(finalScore * 100) / 100,
    proximity_score: Math.round(proximityScore * 100) / 100,
    priority_score: Math.round(priorityScore * 100) / 100,
    workload_score: Math.round(workloadScore * 100) / 100,
    stock_score: Math.round(stockScore * 100) / 100,
    distance_km: calculateDistanceForEngineer(engineer, call),
  };
}

function calculateProximityScore(engineer: Engineer, call: Call): number {
  const distance = calculateDistanceForEngineer(engineer, call);
  if (distance === null) return 50;
  if (distance >= MAX_DISTANCE_KM) return 0;
  return Math.max(0, 100 - (distance / MAX_DISTANCE_KM) * 100);
}

function calculateDistanceForEngineer(engineer: Engineer, call: Call): number | null {
  const engineerLoc = getEngineerLocation(engineer);
  if (!engineerLoc || !call.latitude || !call.longitude) return null;
  return calculateDistance(engineerLoc.lat, engineerLoc.lng, call.latitude, call.longitude);
}

function getEngineerLocation(engineer: Engineer): { lat: number; lng: number } | null {
  if (engineer.last_location_lat && engineer.last_location_lng && engineer.last_location_updated_at) {
    const lastUpdate = new Date(engineer.last_location_updated_at).getTime();
    const now = Date.now();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    if (hoursSinceUpdate < LOCATION_STALENESS_HOURS) {
      return {
        lat: Number(engineer.last_location_lat),
        lng: Number(engineer.last_location_lng),
      };
    }
  }

  if (engineer.region && REGION_CENTERS[engineer.region]) {
    return REGION_CENTERS[engineer.region];
  }

  return null;
}

function calculatePriorityScore(call: Call): number {
  const priorityWeights: Record<string, number> = {
    urgent: 100,
    high: 75,
    medium: 50,
    low: 25,
  };

  let score = priorityWeights[call.priority] || 50;

  const scheduledDate = new Date(call.scheduled_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduledDate.setHours(0, 0, 0, 0);

  if (scheduledDate < today) {
    score = Math.min(100, score + 10);
  } else if (scheduledDate.getTime() === today.getTime()) {
    score = Math.min(100, score + 5);
  }

  return score;
}

function calculateWorkloadScore(engineer: Engineer, workloadMap: Map<string, number>): number {
  const currentCalls = workloadMap.get(engineer.id) || Number(engineer.active_calls_count) || 0;
  if (currentCalls >= MAX_CALLS_PER_ENGINEER) return 0;
  return 100 - (currentCalls / MAX_CALLS_PER_ENGINEER) * 100;
}

function calculateStockScore(engineer: Engineer, call: Call): number {
  const requiresDevice = call.type === 'install' || call.type === 'swap';
  if (!requiresDevice) return 100;

  const stockByBank = engineer.stock_count_by_bank || {};
  const availableDevices = stockByBank[call.client_bank] || 0;

  if (availableDevices === 0) return 0;
  if (availableDevices >= IDEAL_STOCK_COUNT) return 100;
  return Math.min(100, (availableDevices / IDEAL_STOCK_COUNT) * 100);
}

export function rankEngineers(
  a: { engineer: Engineer; scores: any },
  b: { engineer: Engineer; scores: any },
  stockMap: Map<string, Map<string, number>>,
  bankId: string
): number {
  if (Math.abs(a.scores.final_score - b.scores.final_score) > 0.01) {
    return b.scores.final_score - a.scores.final_score;
  }

  const aWorkload = Number(a.engineer.active_calls_count);
  const bWorkload = Number(b.engineer.active_calls_count);
  if (aWorkload !== bWorkload) {
    return aWorkload - bWorkload;
  }

  const aStock = stockMap.get(a.engineer.id)?.get(bankId) || 0;
  const bStock = stockMap.get(b.engineer.id)?.get(bankId) || 0;
  if (aStock !== bStock) {
    return bStock - aStock;
  }

  const aDistance = a.scores.distance_km || 999999;
  const bDistance = b.scores.distance_km || 999999;
  if (Math.abs(aDistance - bDistance) > 0.1) {
    return aDistance - bDistance;
  }

  const aLastAssignment = a.engineer.last_assignment_at ? new Date(a.engineer.last_assignment_at).getTime() : 0;
  const bLastAssignment = b.engineer.last_assignment_at ? new Date(b.engineer.last_assignment_at).getTime() : 0;
  if (aLastAssignment !== bLastAssignment) {
    return aLastAssignment - bLastAssignment;
  }

  return a.engineer.id.localeCompare(b.engineer.id);
}