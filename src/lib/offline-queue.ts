interface QueuedAction {
  id: string;
  type: 'start-call' | 'scan-device' | 'submit-completion' | 'upload-photo';
  payload: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

const QUEUE_KEY = 'uds_offline_queue';
const MAX_RETRIES = 3;

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
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  addAction(type: QueuedAction['type'], payload: any): string {
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

    const pendingActions = this.queue.filter(a => a.status === 'pending');

    for (const action of pendingActions) {
      try {
        action.status = 'processing';
        this.saveQueue();

        await this.executeAction(action);

        this.queue = this.queue.filter(a => a.id !== action.id);
        this.saveQueue();
      } catch (error: any) {
        action.retries++;

        if (action.retries >= MAX_RETRIES) {
          action.status = 'failed';
          action.error = error.message;
        } else {
          action.status = 'pending';
        }

        this.saveQueue();
      }
    }

    this.processing = false;
  }

  private async executeAction(action: QueuedAction) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const token = localStorage.getItem('supabase.auth.token');

    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${this.getEndpoint(action.type)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
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
