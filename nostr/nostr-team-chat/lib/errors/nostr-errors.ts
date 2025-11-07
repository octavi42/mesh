/**
 * Custom error types for the Nostr Team Chat application
 * Provides structured error handling with recovery strategies
 */

export enum ErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  RELAY_UNAVAILABLE = 'RELAY_UNAVAILABLE',
  AUTH_FAILED = 'AUTH_FAILED',

  // Data errors
  FETCH_FAILED = 'FETCH_FAILED',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  CACHE_ERROR = 'CACHE_ERROR',

  // Subscription errors
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
  SUBSCRIPTION_TIMEOUT = 'SUBSCRIPTION_TIMEOUT',

  // Publishing errors
  PUBLISH_FAILED = 'PUBLISH_FAILED',
  SIGN_FAILED = 'SIGN_FAILED',
  INVALID_EVENT = 'INVALID_EVENT',

  // Workspace errors
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_FULL = 'WORKSPACE_FULL',

  // Message errors
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  MESSAGE_FAILED = 'MESSAGE_FAILED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  workspaceId?: string;
  channelId?: string;
  relayUrl?: string;
  timestamp?: number;
  userPubkey?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  canRetry: boolean;
  retryAfter?: number; // milliseconds
  maxRetries?: number;
  fallbackAction?: string;
  userAction?: string;
}

/**
 * Main error class for Nostr operations
 */
export class NostrError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly recovery: RecoveryStrategy;
  public readonly timestamp: number;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    recovery: Partial<RecoveryStrategy> = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'NostrError';
    this.code = code;
    this.context = { ...context, timestamp: Date.now() };
    this.timestamp = Date.now();
    this.originalError = originalError;

    // Set default recovery strategy based on error code
    this.recovery = {
      ...this.getDefaultRecovery(code),
      ...recovery
    };

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NostrError);
    }
  }

  /**
   * Get user-friendly error message
   */
  get userMessage(): string {
    switch (this.code) {
      case ErrorCode.CONNECTION_FAILED:
        return 'Failed to connect to Nostr relays. Please check your internet connection.';
      case ErrorCode.CONNECTION_TIMEOUT:
        return 'Connection timed out. The relay may be temporarily unavailable.';
      case ErrorCode.AUTH_FAILED:
        return 'Authentication failed. Please try logging in again.';
      case ErrorCode.FETCH_FAILED:
        return 'Failed to load data. This might be a temporary issue.';
      case ErrorCode.WORKSPACE_NOT_FOUND:
        return 'Workspace not found or you may not have access to it.';
      case ErrorCode.CHANNEL_NOT_FOUND:
        return 'Channel not found or may have been deleted.';
      case ErrorCode.MESSAGE_FAILED:
        return 'Failed to send message. Please try again.';
      case ErrorCode.MESSAGE_TOO_LONG:
        return 'Message is too long. Please shorten it and try again.';
      case ErrorCode.INSUFFICIENT_PERMISSIONS:
        return 'You do not have permission to perform this action.';
      case ErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Get technical details for debugging
   */
  get debugInfo(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      recovery: this.recovery,
      timestamp: new Date(this.timestamp).toISOString(),
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }

  /**
   * Create error from unknown error object
   */
  static fromUnknown(
    error: unknown,
    context: ErrorContext = {},
    defaultMessage = 'An unexpected error occurred'
  ): NostrError {
    if (error instanceof NostrError) {
      return error;
    }

    if (error instanceof Error) {
      const code = NostrError.inferErrorCode(error);
      return new NostrError(
        error.message || defaultMessage,
        code,
        context,
        {},
        error
      );
    }

    return new NostrError(
      defaultMessage,
      ErrorCode.UNKNOWN_ERROR,
      context
    );
  }

  /**
   * Infer error code from error message or type
   */
  private static inferErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCode.CONNECTION_TIMEOUT;
    }
    if (message.includes('connection') || message.includes('connect')) {
      return ErrorCode.CONNECTION_FAILED;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorCode.AUTH_FAILED;
    }
    if (message.includes('parse') || message.includes('json')) {
      return ErrorCode.PARSE_ERROR;
    }
    if (message.includes('fetch') || message.includes('load')) {
      return ErrorCode.FETCH_FAILED;
    }
    if (message.includes('publish') || message.includes('send')) {
      return ErrorCode.PUBLISH_FAILED;
    }
    if (message.includes('sign')) {
      return ErrorCode.SIGN_FAILED;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return ErrorCode.RATE_LIMITED;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Get default recovery strategy for error code
   */
  private getDefaultRecovery(code: ErrorCode): RecoveryStrategy {
    switch (code) {
      case ErrorCode.CONNECTION_TIMEOUT:
      case ErrorCode.CONNECTION_FAILED:
        return {
          canRetry: true,
          retryAfter: 2000,
          maxRetries: 3,
          userAction: 'Check your internet connection'
        };

      case ErrorCode.RELAY_UNAVAILABLE:
      case ErrorCode.FETCH_FAILED:
        return {
          canRetry: true,
          retryAfter: 1000,
          maxRetries: 2,
          fallbackAction: 'Use cached data'
        };

      case ErrorCode.AUTH_FAILED:
        return {
          canRetry: true,
          retryAfter: 0,
          maxRetries: 1,
          userAction: 'Please log in again'
        };

      case ErrorCode.RATE_LIMITED:
        return {
          canRetry: true,
          retryAfter: 30000,
          maxRetries: 1,
          userAction: 'Please wait and try again'
        };

      case ErrorCode.MESSAGE_TOO_LONG:
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_DATA:
        return {
          canRetry: false,
          userAction: 'Please correct the input and try again'
        };

      case ErrorCode.INSUFFICIENT_PERMISSIONS:
      case ErrorCode.WORKSPACE_NOT_FOUND:
      case ErrorCode.CHANNEL_NOT_FOUND:
        return {
          canRetry: false,
          userAction: 'Contact your administrator or try a different action'
        };

      case ErrorCode.SUBSCRIPTION_FAILED:
      case ErrorCode.SUBSCRIPTION_TIMEOUT:
        return {
          canRetry: true,
          retryAfter: 5000,
          maxRetries: 2,
          fallbackAction: 'Manual refresh may be needed'
        };

      default:
        return {
          canRetry: true,
          retryAfter: 1000,
          maxRetries: 1
        };
    }
  }
}

/**
 * Specific error classes for different domains
 */

export class ConnectionError extends NostrError {
  constructor(
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, ErrorCode.CONNECTION_FAILED, context, {}, originalError);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends NostrError {
  constructor(
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, ErrorCode.AUTH_FAILED, context, {}, originalError);
    this.name = 'AuthenticationError';
  }
}

export class WorkspaceError extends NostrError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, {}, originalError);
    this.name = 'WorkspaceError';
  }
}

export class MessageError extends NostrError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, {}, originalError);
    this.name = 'MessageError';
  }
}

/**
 * Error aggregator for collecting multiple errors
 */
export class ErrorCollection extends Error {
  public readonly errors: NostrError[];
  public readonly timestamp: number;

  constructor(errors: NostrError[], message?: string) {
    const defaultMessage = `Multiple errors occurred (${errors.length})`;
    super(message || defaultMessage);
    this.name = 'ErrorCollection';
    this.errors = errors;
    this.timestamp = Date.now();
  }

  get userMessage(): string {
    if (this.errors.length === 1) {
      return this.errors[0].userMessage;
    }

    const uniqueMessages = [...new Set(this.errors.map(e => e.userMessage))];
    if (uniqueMessages.length === 1) {
      return uniqueMessages[0];
    }

    return `Multiple issues occurred: ${uniqueMessages.slice(0, 2).join(', ')}${
      uniqueMessages.length > 2 ? '...' : ''
    }`;
  }

  get canRetry(): boolean {
    return this.errors.some(e => e.recovery.canRetry);
  }

  get retryableErrors(): NostrError[] {
    return this.errors.filter(e => e.recovery.canRetry);
  }
}

/**
 * Utility functions for error handling
 */
export const ErrorUtils = {
  /**
   * Check if error is retryable
   */
  isRetryable(error: Error): boolean {
    if (error instanceof NostrError) {
      return error.recovery.canRetry;
    }
    if (error instanceof ErrorCollection) {
      return error.canRetry;
    }
    return true; // Unknown errors are considered retryable
  },

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: Error, attempt: number = 1): number {
    if (error instanceof NostrError) {
      const baseDelay = error.recovery.retryAfter || 1000;
      return baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
    }
    return 1000 * Math.pow(2, attempt - 1);
  },

  /**
   * Check if max retries exceeded
   */
  canRetryAgain(error: Error, attempt: number): boolean {
    if (error instanceof NostrError) {
      const maxRetries = error.recovery.maxRetries || 3;
      return attempt < maxRetries;
    }
    return attempt < 3;
  },

  /**
   * Create error from fetch response
   */
  fromResponse(
    response: Response,
    context: ErrorContext = {}
  ): NostrError {
    if (response.status === 401) {
      return new AuthenticationError(
        'Authentication failed',
        { ...context, metadata: { status: response.status } }
      );
    }

    if (response.status === 429) {
      return new NostrError(
        'Rate limited',
        ErrorCode.RATE_LIMITED,
        { ...context, metadata: { status: response.status } }
      );
    }

    if (response.status >= 500) {
      return new NostrError(
        'Server error',
        ErrorCode.RELAY_UNAVAILABLE,
        { ...context, metadata: { status: response.status } }
      );
    }

    return new NostrError(
      `Request failed with status ${response.status}`,
      ErrorCode.FETCH_FAILED,
      { ...context, metadata: { status: response.status } }
    );
  },

  /**
   * Log error with structured data
   */
  logError(error: Error, context: ErrorContext = {}): void {
    if (error instanceof NostrError) {
      console.error('NostrError:', {
        code: error.code,
        message: error.message,
        context: { ...error.context, ...context },
        recovery: error.recovery,
        timestamp: new Date(error.timestamp).toISOString()
      });
    } else {
      console.error('Unknown error:', error, context);
    }
  },

  /**
   * Report error to monitoring service (placeholder)
   */
  reportError(error: Error, context: ErrorContext = {}): void {
    // In a real app, this would send to Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement error reporting
      console.warn('Error reporting not implemented');
    }
  }
};