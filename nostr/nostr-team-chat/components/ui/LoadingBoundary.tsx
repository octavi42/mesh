'use client';

import { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from './button';
import { NostrError, ErrorCode } from '@/lib/errors/nostr-errors';

export interface LoadingBoundaryProps {
  isLoading?: boolean;
  error?: NostrError | Error | string | null;
  onRetry?: () => void;
  children: ReactNode;
  fallback?: ReactNode;
  loadingText?: string;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  minHeight?: string;
  className?: string;
}

/**
 * Universal loading boundary component that handles loading, error, and empty states
 */
export function LoadingBoundary({
  isLoading = false,
  error = null,
  onRetry,
  children,
  fallback,
  loadingText = 'Loading...',
  emptyState,
  isEmpty = false,
  minHeight = 'h-64',
  className = ''
}: LoadingBoundaryProps) {
  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        minHeight={minHeight}
        className={className}
      />
    );
  }

  // Loading state
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <LoadingDisplay
        text={loadingText}
        minHeight={minHeight}
        className={className}
      />
    );
  }

  // Empty state
  if (isEmpty && emptyState) {
    return (
      <div className={`flex items-center justify-center ${minHeight} ${className}`}>
        {emptyState}
      </div>
    );
  }

  // Success state - render children
  return <>{children}</>;
}

interface LoadingDisplayProps {
  text: string;
  minHeight: string;
  className: string;
  size?: 'sm' | 'md' | 'lg';
}

function LoadingDisplay({ text, minHeight, className, size = 'md' }: LoadingDisplayProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} ${className}`}>
      <div className="flex items-center space-x-3">
        <div
          className={`${sizeClasses[size]} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`}
        />
        <span className={`text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>
          {text}
        </span>
      </div>
    </div>
  );
}

interface ErrorDisplayProps {
  error: NostrError | Error | string;
  onRetry?: () => void;
  minHeight: string;
  className: string;
}

function ErrorDisplay({ error, onRetry, minHeight, className }: ErrorDisplayProps) {
  let errorMessage: string;
  let errorCode: string | null = null;
  let canRetry = true;
  let isConnectionError = false;

  if (error instanceof NostrError) {
    errorMessage = error.userMessage;
    errorCode = error.code;
    canRetry = error.recovery.canRetry;
    isConnectionError = [
      ErrorCode.CONNECTION_FAILED,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.RELAY_UNAVAILABLE
    ].includes(error.code);
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
  }

  const getErrorIcon = () => {
    if (isConnectionError) {
      return <WifiOff className="w-8 h-8 text-red-500" />;
    }
    return <AlertCircle className="w-8 h-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (isConnectionError) {
      return 'Connection Problem';
    }
    if (errorCode === ErrorCode.AUTH_FAILED) {
      return 'Authentication Error';
    }
    if (errorCode === ErrorCode.WORKSPACE_NOT_FOUND) {
      return 'Workspace Not Found';
    }
    if (errorCode === ErrorCode.CHANNEL_NOT_FOUND) {
      return 'Channel Not Found';
    }
    return 'Something went wrong';
  };

  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} ${className}`}>
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-4">
          {getErrorIcon()}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {getErrorTitle()}
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessage}
        </p>

        {errorCode && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">
            Error Code: {errorCode}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="default"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
          )}

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Page</span>
          </Button>
        </div>

        {isConnectionError && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex">
              <Wifi className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Connection Tips:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Try switching networks</li>
                  <li>The relay may be temporarily unavailable</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline loading spinner for smaller components
 */
export function InlineSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin ${className}`}
    />
  );
}

/**
 * Loading skeleton for content placeholders
 */
export function ContentSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 rounded h-4 mb-3 ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Message list skeleton
 */
export function MessageListSkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex space-x-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Workspace list skeleton
 */
export function WorkspaceListSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Progress indicator for operations
 */
export function ProgressIndicator({
  progress,
  label,
  className = ''
}: {
  progress: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Connection status indicator
 */
export function ConnectionStatus({
  isConnected,
  isConnecting,
  className = ''
}: {
  isConnected: boolean;
  isConnecting: boolean;
  className?: string;
}) {
  if (isConnecting) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 ${className}`}>
        <InlineSpinner size="sm" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-2 text-green-600 dark:text-green-400 ${className}`}>
        <Wifi className="w-4 h-4" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-red-600 dark:text-red-400 ${className}`}>
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">Disconnected</span>
    </div>
  );
}