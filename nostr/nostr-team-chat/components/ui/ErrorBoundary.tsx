'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './button';
import { NostrError, ErrorUtils } from '@/lib/errors/nostr-errors';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

/**
 * React Error Boundary component with enhanced error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error with context
    ErrorUtils.logError(error, {
      component: 'ErrorBoundary',
      level: this.props.level || 'component',
      errorId: this.state.errorId || undefined,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    // Report error
    ErrorUtils.reportError(error, {
      component: 'ErrorBoundary',
      level: this.props.level,
      errorInfo
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    console.error('Error caught by ErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level,
      errorId: this.state.errorId
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI based on level
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { error, errorInfo, errorId } = this.state;
    const { level = 'component', showDetails = false } = this.props;

    if (level === 'page') {
      return this.renderPageError();
    }

    if (level === 'section') {
      return this.renderSectionError();
    }

    return this.renderComponentError();
  }

  private renderPageError() {
    const { error, errorId } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              We encountered an unexpected error. This has been reported to our team.
            </p>
          </div>

          {errorId && (
            <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Error ID: {errorId}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>

            <Button
              onClick={this.handleReload}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </Button>

            <Button
              onClick={this.handleGoHome}
              variant="ghost"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </Button>
          </div>

          {this.props.showDetails && error && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Technical Details
              </summary>
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono overflow-auto max-h-40">
                <p className="text-red-600 dark:text-red-400 mb-2">{error.message}</p>
                <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  private renderSectionError() {
    const { error, errorId } = this.state;

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Section Error
        </h3>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
          This section encountered an error and couldn't load properly.
        </p>

        {errorId && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-4">
            Error ID: {errorId}
          </p>
        )}

        <div className="flex space-x-3">
          <Button
            onClick={this.handleRetry}
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>

          <Button
            onClick={this.handleReload}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload</span>
          </Button>
        </div>

        {this.props.showDetails && error && (
          <details className="mt-6 w-full">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Error Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-auto max-h-32">
              <p className="text-red-600 dark:text-red-400">{error.message}</p>
            </div>
          </details>
        )}
      </div>
    );
  }

  private renderComponentError() {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-3">
          <Bug className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Component Error
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This component failed to render
            </p>
          </div>
          <Button
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }
}

/**
 * Hook version of error boundary for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Higher-order component for adding error boundaries
 */
export function errorBoundary(
  level: 'page' | 'section' | 'component' = 'component',
  options: Partial<ErrorBoundaryProps> = {}
) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return withErrorBoundary(Component, { level, ...options });
  };
}

/**
 * Async error boundary for handling promise rejections
 */
export function AsyncErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Convert to Error if it's not already
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      // Log with context
      ErrorUtils.logError(error, {
        component: 'AsyncErrorBoundary',
        metadata: {
          type: 'unhandledRejection',
          reason: event.reason
        }
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
}