import { useState, useCallback } from 'react';
import {
  isWebhookConfigured,
  triggerCallStatusUpdate,
  triggerDailyEngineerSummary,
  triggerStockAlert,
  triggerGoogleSheetsSync,
  triggerCustomWebhook,
  CallStatusPayload,
  EngineerSummaryPayload,
  StockAlertPayload,
  GoogleSheetsSyncPayload,
} from './webhooks';

export function useWebhookStatus() {
  return {
    isConfigured: isWebhookConfigured(),
  };
}

export function useCallStatusWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);

  const trigger = useCallback(async (payload: CallStatusPayload) => {
    if (!isWebhookConfigured()) {
      setError('Webhook not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await triggerCallStatusUpdate(payload);
      if (result.success) {
        setLastTriggered(new Date());
        return true;
      } else {
        setError(result.error || 'Failed to trigger webhook');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { trigger, loading, error, lastTriggered };
}

export function useEngineerSummaryWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async (payload: EngineerSummaryPayload) => {
    if (!isWebhookConfigured()) {
      setError('Webhook not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await triggerDailyEngineerSummary(payload);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { trigger, loading, error };
}

export function useStockAlertWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async (payload: StockAlertPayload) => {
    if (!isWebhookConfigured()) {
      setError('Webhook not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await triggerStockAlert(payload);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { trigger, loading, error };
}

export function useGoogleSheetsSyncWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const sync = useCallback(async (payload: GoogleSheetsSyncPayload) => {
    if (!isWebhookConfigured()) {
      setError('Webhook not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await triggerGoogleSheetsSync(payload);
      if (result.success) {
        setLastSync(new Date());
        return true;
      } else {
        setError(result.error || 'Sync failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sync, loading, error, lastSync };
}

export function useCustomWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async (
    endpoint: string,
    eventType: string,
    data: Record<string, unknown>
  ) => {
    if (!isWebhookConfigured()) {
      setError('Webhook not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await triggerCustomWebhook(endpoint, eventType, data);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { trigger, loading, error };
}
