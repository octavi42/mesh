/**
 * Console override for production
 * 
 * This module silences console output in production environments.
 * Import this in your app's entry point (layout.tsx or providers.tsx)
 * 
 * In production: All console.log and console.debug are silenced
 * Errors and warnings are still logged for debugging critical issues
 */

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || (isProduction ? 'error' : 'debug');

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// No-op function
const noop = () => {};

/**
 * Initialize console overrides based on log level
 * Call this once at app startup
 */
export function initializeConsole(): void {
  if (typeof window === 'undefined') {
    // Server-side: don't override
    return;
  }

  switch (logLevel) {
    case 'none':
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      console.error = noop;
      break;
    case 'error':
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      // console.error remains
      break;
    case 'warn':
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      // console.warn and console.error remain
      break;
    case 'info':
      console.log = noop;
      console.debug = noop;
      // console.info, console.warn, and console.error remain
      break;
    case 'debug':
    default:
      // Keep all console methods
      break;
  }
}

/**
 * Restore original console methods
 * Useful for debugging in production
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  initializeConsole();
}
