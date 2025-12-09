import { supabase } from './supabase';

// Action payload types for type safety
interface StartCallPayload {
  call_id: string;
  start_timestamp: string;
  start_gps?: { latitude: number; longitude: number };
}

interface ScanDevicePayload {
  device_id: string;
  serial_number: string;
  call_id?: string;
}

interface SubmitCompletionPayload {
  call_id: string;
  resolution_notes: string;
  actual_duration_minutes: number;
  completion_timestamp: string;
  completion_gps?: { latitude: number; longitude: number };
  devices: Array<{ device_id: string; action: string; serial_number?: string }>;
}

interface UploadPhotoPayload {
  call_id: string;
  photo_data: string;
  photo_type: string;
}

type ActionPayload = StartCallPayload | ScanDevicePayload | SubmitCompletionPayload | UploadPhotoPayload;

interface QueuedAction {
  id: string;
  type: 'start-call' | 'scan-device' | 'submit-completion' | 'upload-photo';
  payload: ActionPayload;
  timestamp: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

const QUEUE_KEY = 'uds_offline_queue';
const MAX_RETRIES = 3;

// Debug logging helper - only logs in development
const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[OfflineQueue]', ...args);
  }
};

export class OfflineQueue {
  private queue: QueuedAction[] = [];
  private processing = false;

  constructor() {
    this.loadQueue();
    window.addEventListener('online', () => this.processQueue());
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        debugLog('Loaded queue with', this.queue.length, 'items');
      }
    } catch (error) {
      debugLog('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      debugLog('Failed to save offline queue:', error);
    }
  }

  addAction(type: QueuedAction['type'], payload: ActionPayload): string {
    const action: QueuedAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
    };

    this.queue.push(action);
    this.saveQueue();
    debugLog('Added action:', type, 'Queue size:', this.queue.length);

    if (navigator.onLine) {
      this.processQueue();
    }

    return action.id;
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.processing = true;
    debugLog('Processing queue...');

    const pendingActions = this.queue.filter(a => a.status === 'pending');

    for (const action of pendingActions) {
      try {
        action.status = 'processing';
        this.saveQueue();

        await this.executeAction(action);

        this.queue = this.queue.filter(a => a.id !== action.id);
        this.saveQueue();
        debugLog('Action completed:', action.type);
      } catch (error) {
        action.retries++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (action.retries >= MAX_RETRIES) {
          action.status = 'failed';
          action.error = errorMessage;
          debugLog('Action failed permanently:', action.type, errorMessage);
        } else {
          action.status = 'pending';
          debugLog('Action retry scheduled:', action.type, 'Attempt:', action.retries);
        }

        this.saveQueue();
      }
    }

    this.processing = false;
  }

  private async executeAction(action: QueuedAction) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

    // Get the current session token from Supabase (correct method for v2)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No authentication token available - please sign in again');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${this.getEndpoint(action.type)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  private getEndpoint(type: QueuedAction['type']): string {
    const endpoints: Record<QueuedAction['type'], string> = {
      'start-call': 'start-call',
      'scan-device': 'scan-device',
      'submit-completion': 'submit-call-completion',
      'upload-photo': 'upload-photo',
    };
    return endpoints[type];
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.filter(a => a.status === 'pending').length;
  }

  getFailedCount(): number {
    return this.queue.filter(a => a.status === 'failed').length;
  }

  clearFailed() {
    this.queue = this.queue.filter(a => a.status !== 'failed');
    this.saveQueue();
  }

  retryFailed() {
    this.queue.forEach(a => {
      if (a.status === 'failed') {
        a.status = 'pending';
        a.retries = 0;
        a.error = undefined;
      }
    });
    this.saveQueue();
    this.processQueue();
  }
}

export const offlineQueue = new OfflineQueue();
