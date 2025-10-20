'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { LogIn, LogOut } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className = '' }: LoginButtonProps) {
  const { isAuthenticated, loading } = useAuthStore();

  const handleLogin = async () => {
    console.log('🔘 Login button clicked');

    try {
      const { launch } = await import('nostr-login');
      launch('welcome');
    } catch (error) {
      console.error('❌ Failed to launch nostr-login:', error);
    }
  };

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked');

    try {
      const nostrLogin = await import('nostr-login');
      if (nostrLogin.logout) {
        nostrLogin.logout();
      }
    } catch (error) {
      console.error('❌ Failed to logout:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={handleLogout}
        className={`flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors ${className}`}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className={`flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors ${className}`}
    >
      <LogIn className="w-4 h-4" />
      Connect Nostr
    </button>
  );
}
