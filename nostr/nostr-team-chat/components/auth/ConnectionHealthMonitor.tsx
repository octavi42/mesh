'use client';

import { useEffect } from 'react';
import { useNDK } from '@/lib/hooks/use-ndk';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConnectionHealthMonitorProps {
  onReconnect?: () => void;
}

export function ConnectionHealthMonitor({ onReconnect }: ConnectionHealthMonitorProps) {
  const { connectionStatus, checkSignerHealth } = useNDK();

  useEffect(() => {
    // Watch for unhealthy connection status
    if (!connectionStatus.isHealthy) {
      toast.error('Connection to key storage interrupted', {
        description: 'nsec.app may have become inactive. Some features may not work.',
        duration: 8000,
        action: {
          label: 'Reconnect',
          onClick: async () => {
            toast.loading('Reconnecting...', {
              description: 'Attempting to restore connection to nsec.app'
            });

            const isHealthy = await checkSignerHealth();

            if (isHealthy) {
              toast.success('✅ Connection restored!');
              onReconnect?.();
            } else {
              toast.error('❌ Reconnection failed', {
                description: 'Please ensure nsec.app tab is active and try again.'
              });
            }
          }
        }
      });
    }
  }, [connectionStatus.isHealthy, checkSignerHealth, onReconnect]);

  // Return null - this component only shows toasts, no UI
  return null;
}

// Also export a manual reconnect button component
export function ReconnectButton({ onReconnect }: ConnectionHealthMonitorProps) {
  const { connectionStatus, checkSignerHealth } = useNDK();

  const handleReconnect = async () => {
    toast.loading('Reconnecting to nsec.app...');

    const isHealthy = await checkSignerHealth();

    if (isHealthy) {
      toast.success('✅ Connection restored!');
      onReconnect?.();
    } else {
      toast.error('❌ Reconnection failed', {
        description: 'Please ensure nsec.app tab is active and visible.'
      });
    }
  };

  if (connectionStatus.isHealthy) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-yellow-900 px-4 py-3 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">Connection Lost</p>
          <p className="text-xs opacity-90 mt-1">
            nsec.app connection interrupted. Click reconnect to restore.
          </p>
        </div>
        <Button
          onClick={handleReconnect}
          size="sm"
          variant="outline"
          className="border-yellow-900 text-yellow-900 hover:bg-yellow-900 hover:text-yellow-50"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reconnect
        </Button>
      </div>
    </div>
  );
}