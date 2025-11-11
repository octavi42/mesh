/**
 * Nostr Connection Status Component
 * Shows connection state and provides controls for Nostr extension
 */

'use client';

import { AlertCircle, CheckCircle, Loader2, RefreshCw, Zap } from 'lucide-react';
import { useNostr } from '@/lib/hooks/use-nostr';
import { NostrLoginButton } from '@/components/auth/NostrLoginButton';

interface NostrConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onConnect?: () => void;
}

export function NostrConnectionStatus({
  className = '',
  showDetails = false,
  onConnect
}: NostrConnectionStatusProps) {
  const nostr = useNostr();

  const handleRefresh = async () => {
    try {
      await nostr.refresh();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  // Loading state
  if (nostr.isLoading) {
    return (
      <div className={`flex items-center gap-2 text-blue-600 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Detecting Nostr extension...</span>
      </div>
    );
  }

  // Not available state
  if (!nostr.isAvailable) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Nostr extension not found</span>
        </div>
        {showDetails && (
          <div className="ml-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Retry detection"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}
        {showDetails && nostr.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {nostr.error}
          </div>
        )}
      </div>
    );
  }

  // Available but not connected
  if (!nostr.isConnected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Nostr extension detected</span>
        </div>
        <NostrLoginButton variant="inline" />
        {showDetails && nostr.error && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            {nostr.error}
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">
          Connected to {nostr.extensionName}
        </span>
      </div>
      {showDetails && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {nostr.pubkey?.slice(0, 8)}...
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh connection"
          >
            <RefreshCw className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for status indicators
 */
export function NostrConnectionIndicator({ className = '' }: { className?: string }) {
  const nostr = useNostr();

  if (nostr.isLoading) {
    return (
      <div className={`w-2 h-2 rounded-full bg-blue-400 animate-pulse ${className}`}
           title="Detecting Nostr extension..." />
    );
  }

  if (!nostr.isAvailable) {
    return (
      <div className={`w-2 h-2 rounded-full bg-red-400 ${className}`}
           title="Nostr extension not found" />
    );
  }

  if (!nostr.isConnected) {
    return (
      <div className={`w-2 h-2 rounded-full bg-yellow-400 ${className}`}
           title="Nostr extension detected but not connected" />
    );
  }

  return (
    <div className={`w-2 h-2 rounded-full bg-green-400 ${className}`}
         title={`Connected to ${nostr.extensionName}`} />
  );
}

/**
 * Full connection manager component
 */
export function NostrConnectionManager({ className = '' }: { className?: string }) {
  const nostr = useNostr();

  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Nostr Connection</h3>

      <NostrConnectionStatus showDetails={true} />

      {!nostr.isAvailable && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium text-blue-900 mb-2">Install a Nostr Extension:</p>
          <ul className="text-blue-700 space-y-1">
            <li>• <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="underline">Alby Browser Extension</a></li>
            <li>• <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="underline">nos2x Extension</a></li>
          </ul>
        </div>
      )}

      {nostr.isConnected && nostr.pubkey && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-700">
            <span className="font-medium">Public Key:</span>{' '}
            <code className="text-xs bg-green-100 px-1 rounded">{nostr.pubkey}</code>
          </p>
          <div className="mt-2 text-xs text-green-600">
            <p>✓ NIP-04 Support: {nostr.supportsNIP(4) ? 'Yes' : 'No'}</p>
            <p>✓ NIP-44 Support: {nostr.supportsNIP(44) ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}
    </div>
  );
}