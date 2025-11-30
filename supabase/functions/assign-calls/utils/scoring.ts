import { calculateDistance } from './geo.ts';

const PRIORITY_VALUES = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function filterEligibleEngineers(engineers: any[], call: any): any[] {
  return engineers.filter(eng => eng.bank_id === call.client_bank && eng.is_active);
}

export function calculateScores(engineers: any[], call: any, weights: any): any[] {
  const maxDistance = 100;
  const maxWorkload = 10;
  const maxStock = 10;

  return engineers.map(engineer => {
    const distance = calculateDistance(
      engineer.latitude,
      engineer.longitude,
      call.latitude,
      call.longitude
    );

    const proximityScore = distance !== null
      ? Math.max(0, (1 - distance / maxDistance)) * 100
      : 50;

    const priorityValue = PRIORITY_VALUES[call.priority as keyof typeof PRIORITY_VALUES] || 1;
    const priorityScore = (priorityValue / 4) * 100;

    const workload = engineer.engineer_aggregates?.[0]?.active_calls_count || 0;
    const workloadScore = Math.max(0, (1 - workload / maxWorkload)) * 100;

    const stock = engineer.engineer_aggregates?.[0]?.current_device_count || 0;
    const stockScore = Math.min(stock / maxStock, 1) * 100;

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
  });
}

export function rankEngineers(scored: any[]): any[] {
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}
