/**
 * Simple structured logger. Use console for now; can be swapped for Sentry/Datadog later.
 */
export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    if (data != null) {
      console.log(`[INFO] ${msg}`, data);
    } else {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    if (data != null) {
      console.warn(`[WARN] ${msg}`, data);
    } else {
      console.warn(`[WARN] ${msg}`);
    }
  },
  error: (msg: string, error?: unknown, context?: Record<string, unknown>) => {
    if (context != null || error != null) {
      console.error(`[ERROR] ${msg}`, { error, ...context });
    } else {
      console.error(`[ERROR] ${msg}`);
    }
  },
};
