const PREFIX = '[Polylog]';

/**
 * Thin wrapper around `console` so log output is consistently prefixed and
 * debug noise stays out of production builds.
 */
export const Logger = {
  debug(message: string, context?: unknown): void {
    if (import.meta.env.DEV) {
      console.debug(PREFIX, message, context ?? '');
    }
  },
  info(message: string, context?: unknown): void {
    console.info(PREFIX, message, context ?? '');
  },
  warn(message: string, context?: unknown): void {
    console.warn(PREFIX, message, context ?? '');
  },
  error(message: string, context?: unknown): void {
    console.error(PREFIX, message, context ?? '');
  },
};
