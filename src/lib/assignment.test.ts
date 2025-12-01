import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  scoreEngineer,
  rankEngineers,
  getBestEngineer,
  validateWeights,
  assignCalls,
  DEFAULT_WEIGHTS,
  Call,
  Engineer,
} from './assignment';

// Test fixtures
const createCall = (overrides: Partial<Call> = {}): Call => ({
  id: 'call-1',
  call_number: 'CALL-001',
  type: 'install',
  priority: 'medium',
  client_bank: 'bank-1',
  latitude: 19.076,
  longitude: 72.8777,
  ...overrides,
});

const createEngineer = (overrides: Partial<Engineer> = {}): Engineer => ({
  id: 'eng-1',
  name: 'John Doe',
  bank_id: 'bank-1',
  latitude: 19.08,
  longitude: 72.88,
  is_active: true,
  active_calls_count: 2,
  current_device_count: 5,
  ...overrides,
});

describe('Assignment Engine', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = calculateDistance(
        19.076, 72.8777, // Mumbai
        28.6139, 77.209  // Delhi
      );

      expect(distance).toBeDefined();
      // Mumbai to Delhi is approximately 1150-1200 km
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1300);
    });

    it('should return null if any coordinate is null', () => {
      expect(calculateDistance(null, 72.8777, 28.6139, 77.209)).toBeNull();
      expect(calculateDistance(19.076, null, 28.6139, 77.209)).toBeNull();
      expect(calculateDistance(19.076, 72.8777, null, 77.209)).toBeNull();
      expect(calculateDistance(19.076, 72.8777, 28.6139, null)).toBeNull();
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(19.076, 72.8777, 19.076, 72.8777);
      expect(distance).toBe(0);
    });
  });

  describe('scoreEngineer', () => {
    it('should score an engineer for a call', () => {
      const call = createCall();
      const engineer = createEngineer();

      const result = scoreEngineer(call, engineer);

      expect(result.engineer).toBe(engineer);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.proximityScore).toBeDefined();
      expect(result.priorityScore).toBeDefined();
      expect(result.workloadScore).toBeDefined();
      expect(result.stockScore).toBeDefined();
    });

    it('should give higher proximity score to closer engineers', () => {
      const call = createCall();
      const nearEngineer = createEngineer({ latitude: 19.077, longitude: 72.878 });
      const farEngineer = createEngineer({
        id: 'eng-2',
        latitude: 28.6139,
        longitude: 77.209,
      });

      const nearScore = scoreEngineer(call, nearEngineer);
      const farScore = scoreEngineer(call, farEngineer);

      expect(nearScore.proximityScore).toBeGreaterThan(farScore.proximityScore);
    });

    it('should give higher workload score to less busy engineers', () => {
      const call = createCall();
      const idleEngineer = createEngineer({ active_calls_count: 0 });
      const busyEngineer = createEngineer({ id: 'eng-2', active_calls_count: 8 });

      const idleScore = scoreEngineer(call, idleEngineer);
      const busyScore = scoreEngineer(call, busyEngineer);

      expect(idleScore.workloadScore).toBeGreaterThan(busyScore.workloadScore);
    });

    it('should give higher stock score to engineers with more devices', () => {
      const call = createCall();
      const stockedEngineer = createEngineer({ current_device_count: 10 });
      const lowStockEngineer = createEngineer({ id: 'eng-2', current_device_count: 1 });

      const stockedScore = scoreEngineer(call, stockedEngineer);
      const lowStockScore = scoreEngineer(call, lowStockEngineer);

      expect(stockedScore.stockScore).toBeGreaterThan(lowStockScore.stockScore);
    });

    it('should use custom weights', () => {
      const call = createCall();
      const engineer = createEngineer();

      const defaultResult = scoreEngineer(call, engineer, DEFAULT_WEIGHTS);
      const customResult = scoreEngineer(call, engineer, {
        proximity: 1.0,
        priority: 0,
        workload: 0,
        stock: 0,
      });

      expect(customResult.totalScore).toBe(customResult.proximityScore);
      expect(defaultResult.totalScore).not.toBe(customResult.totalScore);
    });
  });

  describe('rankEngineers', () => {
    it('should rank engineers by total score', () => {
      const call = createCall();
      const engineers = [
        createEngineer({ id: 'eng-1', active_calls_count: 8 }), // Busy
        createEngineer({ id: 'eng-2', active_calls_count: 0 }), // Idle
        createEngineer({ id: 'eng-3', active_calls_count: 4 }), // Medium
      ];

      const ranked = rankEngineers(call, engineers);

      expect(ranked[0].engineer.id).toBe('eng-2'); // Idle should be first
      expect(ranked[2].engineer.id).toBe('eng-1'); // Busy should be last
    });

    it('should filter by bank', () => {
      const call = createCall({ client_bank: 'bank-1' });
      const engineers = [
        createEngineer({ id: 'eng-1', bank_id: 'bank-1' }),
        createEngineer({ id: 'eng-2', bank_id: 'bank-2' }),
        createEngineer({ id: 'eng-3', bank_id: 'bank-1' }),
      ];

      const ranked = rankEngineers(call, engineers);

      expect(ranked.length).toBe(2);
      expect(ranked.every(r => r.engineer.bank_id === 'bank-1')).toBe(true);
    });

    it('should filter by active status', () => {
      const call = createCall();
      const engineers = [
        createEngineer({ id: 'eng-1', is_active: true }),
        createEngineer({ id: 'eng-2', is_active: false }),
        createEngineer({ id: 'eng-3', is_active: true }),
      ];

      const ranked = rankEngineers(call, engineers);

      expect(ranked.length).toBe(2);
      expect(ranked.every(r => r.engineer.is_active)).toBe(true);
    });
  });

  describe('getBestEngineer', () => {
    it('should return the best engineer', () => {
      const call = createCall();
      const engineers = [
        createEngineer({ id: 'eng-1', active_calls_count: 8 }),
        createEngineer({ id: 'eng-2', active_calls_count: 0 }),
      ];

      const best = getBestEngineer(call, engineers);

      expect(best).not.toBeNull();
      expect(best?.engineer.id).toBe('eng-2');
    });

    it('should return null when no eligible engineers', () => {
      const call = createCall({ client_bank: 'bank-1' });
      const engineers = [
        createEngineer({ id: 'eng-1', bank_id: 'bank-2' }),
      ];

      const best = getBestEngineer(call, engineers);

      expect(best).toBeNull();
    });
  });

  describe('validateWeights', () => {
    it('should return true for valid weights', () => {
      expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
      expect(validateWeights({
        proximity: 0.5,
        priority: 0.3,
        workload: 0.1,
        stock: 0.1,
      })).toBe(true);
    });

    it('should return false for invalid weights', () => {
      expect(validateWeights({
        proximity: 0.5,
        priority: 0.5,
        workload: 0.5,
        stock: 0.5,
      })).toBe(false);
    });
  });

  describe('assignCalls', () => {
    it('should assign calls to engineers', () => {
      const calls = [
        createCall({ id: 'call-1', call_number: 'CALL-001' }),
        createCall({ id: 'call-2', call_number: 'CALL-002' }),
      ];
      const engineers = [
        createEngineer({ id: 'eng-1', active_calls_count: 0 }),
        createEngineer({ id: 'eng-2', active_calls_count: 0 }),
      ];

      const result = assignCalls(calls, engineers);

      expect(result.assignments.length).toBe(2);
      expect(result.unassigned.length).toBe(0);
    });

    it('should mark calls as unassigned when no engineers available', () => {
      const calls = [
        createCall({ id: 'call-1', client_bank: 'bank-1' }),
      ];
      const engineers = [
        createEngineer({ id: 'eng-1', bank_id: 'bank-2' }),
      ];

      const result = assignCalls(calls, engineers);

      expect(result.assignments.length).toBe(0);
      expect(result.unassigned.length).toBe(1);
    });

    it('should prioritize urgent calls', () => {
      const calls = [
        createCall({ id: 'call-1', priority: 'low' }),
        createCall({ id: 'call-2', priority: 'urgent' }),
        createCall({ id: 'call-3', priority: 'medium' }),
      ];
      const engineers = [
        createEngineer({ id: 'eng-1', active_calls_count: 0 }),
      ];

      const result = assignCalls(calls, engineers);

      // Urgent call should be assigned first to the best engineer
      expect(result.assignments[0].call.id).toBe('call-2');
    });

    it('should distribute load across engineers', () => {
      const calls = [
        createCall({ id: 'call-1' }),
        createCall({ id: 'call-2' }),
        createCall({ id: 'call-3' }),
      ];
      const engineers = [
        createEngineer({ id: 'eng-1', active_calls_count: 0 }),
        createEngineer({ id: 'eng-2', active_calls_count: 0 }),
      ];

      const result = assignCalls(calls, engineers);

      const eng1Assignments = result.assignments.filter(
        a => a.engineer.engineer.id === 'eng-1'
      ).length;
      const eng2Assignments = result.assignments.filter(
        a => a.engineer.engineer.id === 'eng-2'
      ).length;

      // Load should be somewhat distributed (not all to one engineer)
      expect(Math.abs(eng1Assignments - eng2Assignments)).toBeLessThanOrEqual(1);
    });
  });
});
