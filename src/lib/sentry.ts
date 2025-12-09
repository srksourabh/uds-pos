import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function isSentryConfigured(): boolean {
  return !!SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here';
}

export function initSentry() {
  if (!isSentryConfigured()) {
    console.info('Sentry DSN not configured, error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Integration settings
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors
      'Network Error',
      'Failed to fetch',
      'Load failed',
      // User aborted
      'AbortError',
      // Chrome extensions
      'chrome-extension://',
      // Safari quirks
      'Can\'t find variable: webkit',
    ],

    // Set custom tags
    beforeSend(event, _hint) {
      // Filter out non-error events in production
      if (import.meta.env.PROD && event.level === 'info') {
        return null;
      }

      // Add custom context
      event.tags = {
        ...event.tags,
        app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      };

      return event;
    },
  });

  console.info('Sentry initialized');
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  if (!isSentryConfigured()) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Add role as extra context
  if (user.role) {
    Sentry.setTag('user_role', user.role);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  if (!isSentryConfigured()) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (!isSentryConfigured()) {
    console.error('Error (Sentry disabled):', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
) {
  if (!isSentryConfigured()) {
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureMessage(message);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
) {
  if (!isSentryConfigured()) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  if (!isSentryConfigured()) return undefined;
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Wrap an async function with error tracking
 */
export async function withErrorTracking<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    addBreadcrumb('operation', `Starting: ${operation}`, context);
    const result = await fn();
    addBreadcrumb('operation', `Completed: ${operation}`, context);
    return result;
  } catch (error) {
    addBreadcrumb('operation', `Failed: ${operation}`, context, 'error');
    captureException(error, {
      operation,
      ...context,
    });
    throw error;
  }
}

/**
 * Create an error boundary fallback component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for measuring component render times
 */
export const SentryProfiler = Sentry.withProfiler;
