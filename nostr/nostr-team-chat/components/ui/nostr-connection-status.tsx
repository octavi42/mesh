'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useNostr } from '@/lib/hooks/use-nostr';
import { NostrLoginButton } from '@/components/auth/NostrLoginButton';

interface NostrConnectionStatusProps {
  showDetails?: boolean;
}

export function NostrConnectionStatus({ showDetails = false }: NostrConnectionStatusProps) {
  const { isAvailable, isConnected, error, extensionName, checkHealth } = useNostr();
  const [healthStatus, setHealthStatus] = useState<{ healthy: boolean; error?: string } | null>(null);

  const handleHealthCheck = async () => {
    const health = await checkHealth();
    setHealthStatus(health);
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (isAvailable) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    if (isConnected) {
      return `Connected via ${extensionName || 'Nostr Extension'}`;
    } else if (error) {
      if (error.includes('Keys not responding') || error.includes('nsec.app')) {
        return 'nsec.app connection lost - please check if the tab is still open';
      }
      return error;
    } else if (isAvailable) {
      return 'Extension found but not connected';
    } else {
      return 'No Nostr extension found';
    }
  };

  const getRecommendations = () => {
    if (isConnected) return null;

    if (error && (error.includes('Keys not responding') || error.includes('nsec.app'))) {
      return (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <strong>Fix steps:</strong>
          <ul className="list-disc ml-4 mt-1">
            <li>Check if nsec.app tab is still open in your browser</li>
            <li>If closed, open nsec.app again and reload this page</li>
            <li>Make sure your keys are unlocked in nsec.app</li>
            <li>Try the connect button below</li>
          </ul>
        </div>
      );
    }

    if (!isAvailable) {
      return (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>Install a Nostr extension:</strong>
          <ul className="list-disc ml-4 mt-1">
            <li><a href="https://nsec.app" target="_blank" rel="noopener" className="text-blue-600 hover:underline">nsec.app</a> (recommended)</li>
            <li><a href="https://getalby.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Alby</a></li>
            <li><a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener" className="text-blue-600 hover:underline">nos2x</a></li>
          </ul>
        </div>
      );
    }

    return null;
  };

  if (!showDetails && isConnected) {
    // Just show a small status indicator when connected
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        {getStatusIcon()}
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Nostr Connection</span>
        </div>

        <div className="flex gap-2 items-center">
          {(isAvailable || isConnected) && (
            <button
              onClick={handleHealthCheck}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Check Health
            </button>
          )}

          {/* Use our simplified login button */}
          <NostrLoginButton variant="inline" />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {getStatusMessage()}
      </div>

      {healthStatus && (
        <div className={`text-xs p-2 rounded ${
          healthStatus.healthy
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          Health Check: {healthStatus.healthy ? 'Healthy' : `Failed - ${healthStatus.error}`}
        </div>
      )}

      {getRecommendations()}
    </div>
  );
}