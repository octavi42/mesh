import { useState, useCallback, useRef, useEffect } from 'react';
import { NostrError, ErrorCollection, ErrorUtils, ErrorCode, type ErrorContext } from '@/lib/errors/nostr-errors';

export interface ErrorState {
  error: NostrError | ErrorCollection | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  lastRetryAt: number | null;
}

export interface ErrorHandlerOptions {
  maxRetries?: number;
  enableAutoRetry?: boolean;
  onError?: (error: NostrError | ErrorCollection) => void;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: (error: NostrError | ErrorCollection) => void;
  context?: ErrorContext;
}

/**
 * Hook for comprehensive error handling with retry logic
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    enableAutoRetry = false,
    onError,
    onRetry,
    onMaxRetriesReached,
    context = {}
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
    lastRetryAt: null
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle an error with context
   */
  const handleError = useCallback((
    error: unknown,
    additionalContext: ErrorContext = {}
  ) => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const nostrError = NostrError.fromUnknown(error, {
      ...context,
      ...additionalContext
    });

    const canRetry = ErrorUtils.isRetryable(nostrError) &&
                    ErrorUtils.canRetryAgain(nostrError, errorState.retryCount + 1);

    setErrorState(prev => ({
      error: nostrError,
      isRetrying: false,
      retryCount: prev.error ? prev.retryCount : 0, // Reset count for new errors
      canRetry,
      lastRetryAt: null
    }));

    // Log error
    ErrorUtils.logError(nostrError, additionalContext);

    // Report error in production
    if (process.env.NODE_ENV === 'production') {
      ErrorUtils.reportError(nostrError, additionalContext);
    }

    // Call error callback
    onError?.(nostrError);

    console.error('Error handled:', {
      code: nostrError.code,
      message: nostrError.message,
      canRetry,
      retryCount: errorState.retryCount
    });
  }, [context, errorState.retryCount, onError]);

  /**
   * Manually retry the last operation
   */
  const retry = useCallback(async (operation?: () => Promise<void>) => {
    const { error, retryCount } = errorState;

    if (!error || !ErrorUtils.isRetryable(error)) {
      console.warn('Cannot retry: error is not retryable');
      return false;
    }

    if (!ErrorUtils.canRetryAgain(error, retryCount + 1)) {
      console.warn('Cannot retry: max retries exceeded');
      onMaxRetriesReached?.(error);
      return false;
    }

    const attempt = retryCount + 1;
    console.log(`🔄 Retrying operation (attempt ${attempt})`);

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: attempt,
      lastRetryAt: Date.now()
    }));

    // Call retry callback
    onRetry?.(attempt);

    try {
      if (operation) {
        await operation();
      }

      // Success - clear error
      setErrorState(prev => ({
        error: null,
        isRetrying: false,
        retryCount: 0,
        canRetry: false,
        lastRetryAt: prev.lastRetryAt
      }));

      console.log('✅ Retry successful');
      return true;

    } catch (retryError) {
      console.error('❌ Retry failed:', retryError);

      const newNostrError = NostrError.fromUnknown(retryError, context);
      const canRetryAgain = ErrorUtils.canRetryAgain(newNostrError, attempt + 1);

      setErrorState(prev => ({
        error: newNostrError,
        isRetrying: false,
        retryCount: attempt,
        canRetry: canRetryAgain,
        lastRetryAt: prev.lastRetryAt
      }));

      if (!canRetryAgain) {
        onMaxRetriesReached?.(newNostrError);
      }

      return false;
    }
  }, [errorState, context, onRetry, onMaxRetriesReached]);

  /**
   * Schedule automatic retry with delay
   */
  const scheduleRetry = useCallback((operation: () => Promise<void>) => {
    const { error, retryCount } = errorState;

    if (!error || !enableAutoRetry) return;

    const delay = ErrorUtils.getRetryDelay(error, retryCount + 1);

    console.log(`⏰ Scheduling retry in ${delay}ms`);

    retryTimeoutRef.current = setTimeout(() => {
      retry(operation);
    }, delay);
  }, [errorState, enableAutoRetry, retry]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false,
      lastRetryAt: null
    });
  }, []);

  /**
   * Wrap an async operation with error handling
   */
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    operationContext?: ErrorContext
  ) => {
    return async (): Promise<T | null> => {
      try {
        clearError();
        const result = await operation();
        return result;
      } catch (error) {
        handleError(error, operationContext);

        // Schedule auto retry if enabled
        if (enableAutoRetry) {
          scheduleRetry(async () => {
            await operation();
          });
        }

        return null;
      }
    };
  }, [clearError, handleError, enableAutoRetry, scheduleRetry]);

  /**
   * Create a retry handler for a specific operation
   */
  const createRetryHandler = useCallback((
    operation: () => Promise<void>,
    operationContext?: ErrorContext
  ) => {
    return () => retry(async () => {
      try {
        await operation();
      } catch (error) {
        throw NostrError.fromUnknown(error, operationContext);
      }
    });
  }, [retry]);

  return {
    // State
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry: errorState.canRetry,
    lastRetryAt: errorState.lastRetryAt,

    // Actions
    handleError,
    retry,
    clearError,
    withErrorHandling,
    createRetryHandler,

    // Computed
    userMessage: errorState.error?.userMessage || null,
    errorCode: errorState.error instanceof NostrError ? errorState.error.code : null,
    isConnectionError: errorState.error instanceof NostrError &&
                      [ErrorCode.CONNECTION_FAILED, ErrorCode.CONNECTION_TIMEOUT, ErrorCode.RELAY_UNAVAILABLE]
                        .includes(errorState.error.code),
  };
}

/**
 * Hook for handling specific error types
 */
export function useConnectionErrorHandler() {
  return useErrorHandler({
    maxRetries: 3,
    enableAutoRetry: true,
    context: { component: 'connection' },
    onMaxRetriesReached: (error) => {
      console.error('Max connection retries reached:', error);
      // Could show a global notification here
    }
  });
}

export function useWorkspaceErrorHandler(workspaceId?: string) {
  return useErrorHandler({
    maxRetries: 2,
    enableAutoRetry: false,
    context: {
      component: 'workspace',
      workspaceId
    }
  });
}

export function useMessageErrorHandler(channelId?: string) {
  return useErrorHandler({
    maxRetries: 2,
    enableAutoRetry: true,
    context: {
      component: 'messages',
      channelId
    },
    onError: (error) => {
      if (error instanceof NostrError && error.code === ErrorCode.MESSAGE_FAILED) {
        // Could show toast notification for message failures
        console.warn('Message failed to send:', error.userMessage);
      }
    }
  });
}

/**
 * Hook for global error boundary
 */
export function useGlobalErrorHandler() {
  const [globalErrors, setGlobalErrors] = useState<NostrError[]>([]);

  const addGlobalError = useCallback((error: NostrError) => {
    setGlobalErrors(prev => {
      // Limit to last 10 errors
      const updated = [error, ...prev].slice(0, 10);
      return updated;
    });

    // Auto-remove error after 30 seconds
    setTimeout(() => {
      setGlobalErrors(prev => prev.filter(e => e !== error));
    }, 30000);
  }, []);

  const clearGlobalError = useCallback((error: NostrError) => {
    setGlobalErrors(prev => prev.filter(e => e !== error));
  }, []);

  const clearAllGlobalErrors = useCallback(() => {
    setGlobalErrors([]);
  }, []);

  return {
    globalErrors,
    addGlobalError,
    clearGlobalError,
    clearAllGlobalErrors,
    hasErrors: globalErrors.length > 0
  };
}