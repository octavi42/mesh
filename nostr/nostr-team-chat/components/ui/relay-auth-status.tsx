'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Wifi, Clock } from 'lucide-react';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29/client-transition';

interface RelayAuthStatusProps {
  showDetails?: boolean;
}

export function RelayAuthStatus({ showDetails = false }: RelayAuthStatusProps) {
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const client = getGlobalNIP29Client();

  const getStatusInfo = () => {
    const isConnected = client.isConnected();
    const isAuthenticated = client.getAuthenticationStatus();

    if (!isConnected) {
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        status: 'Disconnected',
        message: 'Not connected to relay',
        color: 'text-red-600'
      };
    } else if (!isAuthenticated) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        status: 'Connected (Not Authenticated)',
        message: 'Connected to relay but not authenticated',
        color: 'text-yellow-600'
      };
    } else {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        status: 'Connected & Authenticated',
        message: 'Connected and authenticated to relay',
        color: 'text-green-600'
      };
    }
  };

  const handleReauthenticate = async () => {
    setIsReauthenticating(true);
    setLastError(null);

    try {
      await client.forceReauth();
      console.log('✅ Re-authentication successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      console.error('❌ Re-authentication failed:', error);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const { icon, status, message, color } = getStatusInfo();

  if (!showDetails && client.isConnected()) {
    const isAuthenticated = client.getAuthenticationStatus();
    return (
      <div className={`flex items-center gap-2 text-sm ${isAuthenticated ? 'text-green-600' : 'text-yellow-600'}`}>
        {icon}
        <span>{isAuthenticated ? 'Relay Connected & Authenticated' : 'Relay Connected (Auth Pending)'}</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">Relay Status</span>
        </div>

        <button
          onClick={handleReauthenticate}
          disabled={isReauthenticating}
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isReauthenticating ? 'animate-spin' : ''}`} />
          {isReauthenticating ? 'Re-authenticating...' : 'Re-authenticate'}
        </button>
      </div>

      <div className={`text-sm ${color}`}>
        {status}: {message}
      </div>

      {lastError && (
        <div className="text-xs p-2 bg-red-50 text-red-700 rounded">
          <strong>Last error:</strong> {lastError}
        </div>
      )}

      {!client.isConnected() && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <strong>Troubleshooting:</strong>
          <ul className="list-disc ml-4 mt-1 text-xs">
            <li>Ensure nsec.app is open and unlocked</li>
            <li>Approve any signing requests that appear</li>
            <li>Try the re-authenticate button above</li>
            <li>Refresh the page if issues persist</li>
          </ul>
        </div>
      )}

      {isReauthenticating && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Clock className="w-4 h-4" />
          <span>Please check nsec.app for a signing request...</span>
        </div>
      )}
    </div>
  );
}