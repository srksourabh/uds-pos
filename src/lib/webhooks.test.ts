import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment variable
const mockEnv = {
  VITE_N8N_WEBHOOK_BASE_URL: 'https://n8n.example.com/webhook',
};

vi.mock('./webhooks', async () => {
  const originalModule = await vi.importActual('./webhooks');
  return {
    ...originalModule,
    isWebhookConfigured: () => true,
  };
});

import {
  triggerCallStatusUpdate,
  triggerDailyEngineerSummary,
  triggerStockAlert,
  triggerBatchWebhooks,
} from './webhooks';

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn();
  });

  describe('triggerCallStatusUpdate', () => {
    it('should send call status update webhook', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await triggerCallStatusUpdate({
        call_id: 'call-123',
        call_number: 'CALL-001',
        previous_status: 'pending',
        new_status: 'assigned',
        client_name: 'Test Client',
        client_address: '123 Test St',
        engineer_name: 'John Doe',
      });

      expect(result.success).toBe(true);
    });

    it('should handle webhook failure gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await triggerCallStatusUpdate({
        call_id: 'call-123',
        call_number: 'CALL-001',
        previous_status: 'pending',
        new_status: 'assigned',
        client_name: 'Test Client',
        client_address: '123 Test St',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('triggerDailyEngineerSummary', () => {
    it('should send daily summary webhook', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await triggerDailyEngineerSummary({
        engineer_id: 'eng-123',
        engineer_name: 'John Doe',
        date: '2024-01-15',
        calls_assigned: 10,
        calls_completed: 8,
        calls_pending: 2,
        calls_details: [
          { call_number: 'CALL-001', status: 'completed', client_name: 'Client A' },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('triggerStockAlert', () => {
    it('should send stock alert webhook', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await triggerStockAlert({
        alert_type: 'low_stock',
        severity: 'warning',
        bank_name: 'Test Bank',
        current_count: 5,
        threshold: 10,
        message: 'Stock is running low',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('triggerBatchWebhooks', () => {
    it('should handle batch webhooks', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await triggerBatchWebhooks([
        { endpoint: 'test-1', eventType: 'event_1', data: { foo: 'bar' } },
        { endpoint: 'test-2', eventType: 'event_2', data: { baz: 'qux' } },
        { endpoint: 'test-3', eventType: 'event_3', data: { test: true } },
      ]);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });
});
