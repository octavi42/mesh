'use client';

import { useState, useEffect } from 'react';
import { useNDK } from '@/lib/hooks/use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ConnectionStatus {
  connected: number;
  authenticated: number;
  total: number;
  hasIssues: boolean;
  needsNsecApp: boolean;
}

export function NsecAppStatus() {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: 0,
    authenticated: 0,
    total: 0,
    hasIssues: false,
    needsNsecApp: false
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!ndk) return;

    const checkStatus = () => {
      const relays = Array.from(ndk.pool.relays.values());
      const connected = relays.filter(r => r.status === 1);
      const authenticated = relays.filter(r => r.authenticated);

      const needsNsecApp = pubkey && connected.length > 0 && authenticated.length === 0;
      const hasIssues = connected.length === 0 || needsNsecApp;

      setStatus({
        connected: connected.length,
        authenticated: authenticated.length,
        total: relays.length,
        hasIssues,
        needsNsecApp
      });
    };

    // Check immediately
    checkStatus();

    // Set up listeners for relay events
    const handleRelayEvent = () => {
      setTimeout(checkStatus, 500); // Small delay to let status update
    };

    ndk.pool.on('relay:connect', handleRelayEvent);
    ndk.pool.on('relay:disconnect', handleRelayEvent);
    ndk.pool.on('relay:auth', handleRelayEvent);

    // Periodic check every 10 seconds
    const interval = setInterval(checkStatus, 10000);

    return () => {
      clearInterval(interval);
      ndk.pool.off('relay:connect', handleRelayEvent);
      ndk.pool.off('relay:disconnect', handleRelayEvent);
      ndk.pool.off('relay:auth', handleRelayEvent);
    };
  }, [ndk, pubkey]);

  // Don't show if not logged in
  if (!pubkey) return null;

  // Don't show if everything is working fine
  if (!status.hasIssues && status.authenticated > 0) return null;

  const openNsecApp = () => {
    window.open('https://nsec.app', '_blank');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="m-4 border border-amber-200 bg-amber-50 rounded-lg">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {status.needsNsecApp ? (
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : status.connected === 0 ? (
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          ) : (
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-2">
              {status.needsNsecApp && 'nsec.app Authentication Required'}
              {status.connected === 0 && !status.needsNsecApp && 'Connection Issues'}
              {status.connected > 0 && !status.needsNsecApp && status.authenticated === 0 && 'Authenticating...'}
            </div>

            {status.needsNsecApp && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm">
                  Your messages may not load because nsec.app needs to be active for authentication.
                  <strong> Keep the nsec.app tab open and visible while using this app.</strong>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Relay Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  status.authenticated > 0
                    ? 'bg-green-100 text-green-700'
                    : status.connected > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {status.authenticated > 0 && `✓ ${status.authenticated} authenticated`}
                  {status.authenticated === 0 && status.connected > 0 && `⏳ ${status.connected} connected, authenticating...`}
                  {status.connected === 0 && '✗ Disconnected'}
                </span>
              </div>

              {status.needsNsecApp && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-900 mb-2">Quick Fix:</div>
                  <ol className="text-sm text-blue-800 space-y-1 mb-3">
                    <li>1. Click "Open nsec.app" below</li>
                    <li>2. Keep the nsec.app tab active and visible</li>
                    <li>3. Grant permissions when prompted</li>
                    <li>4. Return to this tab and refresh</li>
                  </ol>

                  <div className="flex gap-2">
                    <Button
                      onClick={openNsecApp}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open nsec.app
                    </Button>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                    >
                      Refresh Page
                    </Button>
                  </div>
                </div>
              )}

              {status.connected === 0 && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="font-medium text-red-900 mb-2">Connection Failed</div>
                  <p className="text-sm text-red-800 mb-2">
                    Cannot connect to message relays. This might be a network issue.
                  </p>
                  <Button onClick={handleRefresh} size="sm" variant="outline">
                    Try Again
                  </Button>
                </div>
              )}

              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>

              {showDetails && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                  <div>Connected Relays: {status.connected}/{status.total}</div>
                  <div>Authenticated Relays: {status.authenticated}/{status.total}</div>
                  <div>User: {pubkey.slice(0, 16)}...</div>
                  <div>NDK Connected: {isConnected ? 'Yes' : 'No'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}