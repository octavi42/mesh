'use client';

import { useRouter } from 'next/navigation';
import { LogIn, LogOut, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-state-manager';
import type { AuthMethod } from '@/lib/auth/types';

interface NostrLoginButtonProps {
  className?: string;
}

export function NostrLoginButton({ className = '' }: NostrLoginButtonProps) {
  const router = useRouter();
  const {
    state,
    session,
    capabilities,
    error,
    isAuthenticated,
    isLoading,
    canRetry,
    getRecommendedMethod,
    dispatch,
  } = useAuthStore();

  const handleLogin = async (method?: AuthMethod) => {
    const authMethod = method || getRecommendedMethod();
    if (!authMethod) {
      console.warn('No authentication method available');
      return;
    }

    await dispatch({ type: 'LOGIN', method: authMethod });
  };

  const handleLogout = async () => {
    await dispatch({ type: 'LOGOUT' });
  };

  const handleRetry = async () => {
    if (error?.retryable) {
      await dispatch({ type: 'CHECK_CAPABILITIES' });
    }
  };

  const handleEnterApp = () => {
    router.push('/app');
  };

  // Loading state
  if (isLoading()) {
    return (
      <div className={`flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-gray-600 dark:text-gray-400">
          {getLoadingMessage(state)}
        </span>
      </div>
    );
  }

  // Error state
  if (state === 'error' && error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error.message}</span>
        </div>
        {canRetry() && (
          <button
            onClick={handleRetry}
            className="px-3 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Authenticated state
  if (isAuthenticated() && session) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          onClick={handleEnterApp}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          Enter App
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    );
  }

  // Unauthenticated state - show login options based on capabilities
  if (state === 'unauthenticated' && capabilities) {
    const recommendedMethod = getRecommendedMethod();

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Primary login button */}
        <button
          onClick={() => handleLogin(recommendedMethod || 'extension')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <LogIn className="w-4 h-4" />
          {getLoginButtonText(recommendedMethod)}
        </button>

        {/* Alternative methods if available */}
        {capabilities.availableMethods.length > 1 && (
          <div className="relative group">
            <button className="px-3 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors">
              More Options
            </button>
            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="py-1 min-w-40">
                {capabilities.availableMethods
                  .filter(method => method !== recommendedMethod)
                  .map(method => (
                    <button
                      key={method}
                      onClick={() => handleLogin(method)}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {getMethodDisplayName(method)}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <button
      onClick={() => handleLogin()}
      className={`flex items-center gap-2 px-5 py-2.5 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed ${className}`}
      disabled
    >
      <LogIn className="w-4 h-4" />
      Connect Nostr
    </button>
  );
}

function getLoadingMessage(state: string): string {
  switch (state) {
    case 'checking-capabilities':
      return 'Detecting auth options...';
    case 'checking-session':
      return 'Checking session...';
    case 'authenticating':
      return 'Connecting...';
    case 'refreshing':
      return 'Refreshing...';
    default:
      return 'Loading...';
  }
}

function getLoginButtonText(method: AuthMethod | null): string {
  switch (method) {
    case 'extension':
      return 'Connect Extension';
    case 'mobile':
      return 'Connect Mobile';
    case 'remote':
      return 'Connect Remote';
    case 'local':
      return 'Use Local Key';
    default:
      return 'Connect Nostr';
  }
}

function getMethodDisplayName(method: AuthMethod): string {
  switch (method) {
    case 'extension':
      return 'Browser Extension';
    case 'mobile':
      return 'Mobile App';
    case 'remote':
      return 'Remote Signer';
    case 'local':
      return 'Local Key';
    default:
      return method;
  }
}