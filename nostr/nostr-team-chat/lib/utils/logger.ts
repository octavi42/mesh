/**
 * Production-ready logger utility
 * 
 * In production: All logs are disabled by default
 * In development: All logs are enabled
 * 
 * Can be controlled via NEXT_PUBLIC_LOG_LEVEL environment variable:
 * - 'none': No logs (default in production)
 * - 'error': Only errors
 * - 'warn': Errors and warnings
 * - 'info': Errors, warnings, and info
 * - 'debug': All logs including debug (default in development)
 */

type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// Cache the log level to avoid repeated checks
let cachedLogLevel: LogLevel | null = null;

function getLogLevel(): LogLevel {
  if (cachedLogLevel !== null) {
    return cachedLogLevel;
  }

  // Check environment variable first
  const envLevel = typeof process !== 'undefined' 
    ? (process.env?.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined)
    : undefined;
    
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    cachedLogLevel = envLevel;
    return envLevel;
  }
  
  // Default: debug in development, none in production
  const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  cachedLogLevel = isProduction ? 'none' : 'debug';
  return cachedLogLevel;
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

// No-op function for production
const noop = () => {};

/**
 * Logger interface for consistent logging across the application
 */
export const logger = {
  /**
   * Debug level logs - verbose information for development
   */
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.log(...args);
    }
  },

  /**
   * Info level logs - general information
   */
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.log(...args);
    }
  },

  /**
   * Warning level logs - potential issues
   */
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },

  /**
   * Error level logs - actual errors (always logged unless level is 'none')
   */
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },

  /**
   * Group logs together (development only)
   */
  group: (label: string): void => {
    if (shouldLog('debug')) {
      console.group(label);
    }
  },

  /**
   * End a log group (development only)
   */
  groupEnd: (): void => {
    if (shouldLog('debug')) {
      console.groupEnd();
    }
  },

  /**
   * Log with a specific context/module name
   */
  withContext: (context: string) => ({
    debug: (...args: unknown[]) => logger.debug(`[${context}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${context}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${context}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${context}]`, ...args),
  }),
};

// Pre-configured loggers for different modules
export const ndkLogger = logger.withContext('NDK');
export const authLogger = logger.withContext('Auth');
export const messageLogger = logger.withContext('Messages');
export const workspaceLogger = logger.withContext('Workspace');
export const channelLogger = logger.withContext('Channels');
export const inviteLogger = logger.withContext('Invites');

/**
 * For quick migration: drop-in replacements for console methods
 * These can be imported and used directly to replace console.log etc.
 */
export const log = logger.debug;
export const warn = logger.warn;
export const error = logger.error;
