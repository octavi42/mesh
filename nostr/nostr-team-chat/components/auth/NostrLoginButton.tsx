'use client';

import { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface NostrLoginButtonProps {
  className?: string;
  variant?: 'button' | 'inline';
}

export function NostrLoginButton({ className = '', variant = 'button' }: NostrLoginButtonProps) {
  const { isAuthenticated, pubkey, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const { launch } = await import('nostr-login');

      console.log('🚀 Launching nostr-login modal...');

      // Launch with specific screen for better UX
      await launch('welcome');

      console.log('✅ nostr-login modal launched successfully');
    } catch (error) {
      console.error('❌ Failed to launch nostr-login:', error);

      // If popup blocked or other issue, provide guidance
      if (error instanceof Error) {
        if (error.message.includes('popup') || error.message.includes('blocked')) {
          const userConfirmed = confirm(
            'Popup blocked! This prevents nsec.app from opening.\n\n' +
            'Please allow popups for this site and try again.\n\n' +
            'Click OK to manually open nsec.app in a new tab.'
          );
          if (userConfirmed) {
            window.open('https://nsec.app', '_blank');
            alert(
              'nsec.app opened in a new tab.\n\n' +
              'Instructions:\n' +
              '1. Complete the setup in nsec.app\n' +
              '2. Keep that tab active and visible\n' +
              '3. Return here and try connecting again\n\n' +
              'Note: nsec.app must stay active to respond to signing requests.'
            );
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const { logout } = await import('nostr-login');
      await logout();
      clearAuth();
    } catch (error) {
      console.error('Failed to logout:', error);
      clearAuth(); // Clear local state even if nostr-login logout fails
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && pubkey) {
    if (variant === 'inline') {
      return (
        <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
          <User className="w-4 h-4" />
          <span className="font-medium">
            {pubkey.slice(0, 8)}...{pubkey.slice(-4)}
          </span>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-green-600">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">
            {pubkey.slice(0, 8)}...{pubkey.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {isLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 ${className}`}
      >
        <LogIn className="w-4 h-4" />
        {isLoading ? 'Opening nsec.app...' : 'Connect Keys'}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <LogIn className="w-4 h-4" />
      {isLoading ? 'Opening nsec.app...' : 'Connect with Nostr'}
    </button>
  );
}

/**
 * Simple status indicator showing connection state
 */
export function NostrConnectionIndicator({ className = '' }: { className?: string }) {
  const { isAuthenticated } = useAuthStore();

  return (
    <div
      className={`w-2 h-2 rounded-full ${
        isAuthenticated ? 'bg-green-400' : 'bg-gray-400'
      } ${className}`}
      title={isAuthenticated ? 'Connected to Nostr' : 'Not connected'}
    />
  );
}