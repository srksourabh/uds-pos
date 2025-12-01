/**
 * n8n Webhook Integration Service
 *
 * This service provides integration with n8n workflows via webhooks.
 * It supports various notification types for call status updates,
 * daily summaries, stock alerts, and more.
 */

const N8N_WEBHOOK_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL;

export function isWebhookConfigured(): boolean {
  return !!N8N_WEBHOOK_BASE_URL && N8N_WEBHOOK_BASE_URL !== 'https://your-n8n-instance.com/webhook';
}

export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CallStatusPayload {
  call_id: string;
  call_number: string;
  previous_status: string;
  new_status: string;
  client_name: string;
  client_address: string;
  engineer_name?: string;
  engineer_phone?: string;
  notes?: string;
}

export interface EngineerSummaryPayload {
  engineer_id: string;
  engineer_name: string;
  date: string;
  calls_assigned: number;
  calls_completed: number;
  calls_pending: number;
  average_completion_time_minutes?: number;
  calls_details: {
    call_number: string;
    status: string;
    client_name: string;
  }[];
}

export interface StockAlertPayload {
  alert_type: 'low_stock' | 'device_overdue' | 'faulty_device' | 'missing_device';
  severity: 'info' | 'warning' | 'critical';
  bank_name?: string;
  device_serial?: string;
  current_count?: number;
  threshold?: number;
  message: string;
}

export interface GoogleSheetsSyncPayload {
  sheet_type: 'calls' | 'devices' | 'engineers' | 'movements';
  operation: 'sync' | 'append' | 'update';
  records: Record<string, unknown>[];
}

/**
 * Send a webhook to n8n
 */
async function sendWebhook(
  endpoint: string,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isWebhookConfigured()) {
    console.warn('n8n webhook not configured, skipping:', endpoint);
    return { success: false, error: 'Webhook not configured' };
  }

  const url = `${N8N_WEBHOOK_BASE_URL}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook failed',
    };
  }
}

/**
 * Trigger call status update notification
 */
export async function triggerCallStatusUpdate(data: CallStatusPayload) {
  return sendWebhook('call-status-update', {
    event_type: 'call_status_change',
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      source: 'uds-pos',
      version: '1.0',
    },
  });
}

/**
 * Trigger daily engineer call summary
 */
export async function triggerDailyEngineerSummary(data: EngineerSummaryPayload) {
  return sendWebhook('engineer-daily-summary', {
    event_type: 'daily_summary',
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      source: 'uds-pos',
      report_type: 'engineer_daily',
    },
  });
}

/**
 * Trigger stock alert notification
 */
export async function triggerStockAlert(data: StockAlertPayload) {
  return sendWebhook('stock-alert', {
    event_type: 'stock_alert',
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      source: 'uds-pos',
      severity: data.severity,
    },
  });
}

/**
 * Trigger Google Sheets sync
 */
export async function triggerGoogleSheetsSync(data: GoogleSheetsSyncPayload) {
  return sendWebhook('sheets-sync', {
    event_type: 'google_sheets_sync',
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      source: 'uds-pos',
      sheet_type: data.sheet_type,
    },
  });
}

/**
 * Trigger custom webhook
 */
export async function triggerCustomWebhook(
  endpoint: string,
  eventType: string,
  data: Record<string, unknown>
) {
  return sendWebhook(endpoint, {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      source: 'uds-pos',
      custom: true,
    },
  });
}

/**
 * Batch trigger multiple webhooks
 */
export async function triggerBatchWebhooks(
  webhooks: Array<{ endpoint: string; eventType: string; data: Record<string, unknown> }>
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const results = await Promise.all(
    webhooks.map(w => triggerCustomWebhook(w.endpoint, w.eventType, w.data))
  );

  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.success) {
      succeeded++;
    } else {
      failed++;
      errors.push(`${webhooks[index].endpoint}: ${result.error}`);
    }
  });

  return { succeeded, failed, errors };
}
