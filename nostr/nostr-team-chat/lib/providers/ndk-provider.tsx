'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import NDK, { NDKEvent, NDKSigner, NDKUser } from '@nostr-dev-kit/ndk';
import { NDKSubscription } from '@nostr-dev-kit/ndk';

interface NDKContextValue {
  ndk: NDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  user: NDKUser | null;
  attachSigner: (signer: NDKSigner) => Promise<void>;
  publish: (event: NDKEvent) => Promise<void>;
  subscribe: (filters: any) => NDKSubscription | null;
  checkSignerHealth: () => Promise<boolean>;
  connectionStatus: ConnectionStatus;
}

interface ConnectionStatus {
  isHealthy: boolean;
  lastPingTime: number;
  isSignerResponsive: boolean;
}

const NDKContext = createContext<NDKContextValue | null>(null);

interface NDKProviderProps {
  children: ReactNode;
  relayUrls?: string[];
}

export function NDKProvider({
  children,
  relayUrls: relayUrlsProp = ['wss://groups.contextio.app']
}: NDKProviderProps) {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<NDKUser | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isHealthy: true,
    lastPingTime: Date.now(),
    isSignerResponsive: true
  });

  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeNDK = async () => {
      console.log('🔧 Initializing NDK with signer-first approach');
      setIsConnecting(true);

      try {
        const { getBunkerRelays, requiresBunkerRelay, getAuthStatus } = await import('@/lib/nostr/signer-manager');
        const authStatus = getAuthStatus();

        const relayUrls = requiresBunkerRelay(authStatus.authMethod)
          ? [...relayUrlsProp, ...getBunkerRelays()]
          : relayUrlsProp;

        // Don't pre-attach signers during NDK initialization
        // Let the app initialization handle signer attachment after full auth
        console.log('💡 NDK will initialize without pre-attached signer for better reliability');
        let signer = null;

        // Create NDK instance WITHOUT signer initially for better reliability
        const ndkInstance = new NDK({
          explicitRelayUrls: relayUrls,
          outboxRelayUrls: relayUrls,
          // No signer attached during initialization
        });

        // Set up basic event listeners
        ndkInstance.pool.on('relay:connect', (relay) => {
          console.log('✅ NDK connected to relay:', relay.url);
          setIsConnected(true);
        });

        ndkInstance.pool.on('relay:disconnect', (relay) => {
          console.log('❌ NDK disconnected from relay:', relay.url);
          setIsConnected(false);
        });

        ndkInstance.pool.on('relay:error', (relay, error) => {
          console.error('🚨 NDK relay error:', relay.url, error);
        });

        ndkInstance.pool.on('relay:auth', async (relay, challenge) => {
          console.log('🔐 NDK AUTH challenge from relay:', relay.url, 'challenge:', challenge?.slice(0, 16));
        });

        // Connect to relays without signer first to establish basic connectivity
        console.log('🔌 Connecting to relays for basic connectivity...');
        try {
          await ndkInstance.connect();
          console.log('✅ Basic relay connectivity established');
        } catch (error) {
          console.warn('⚠️ Basic relay connection failed (will retry with signer):', error);
        }

        // Set NDK instance immediately for global access
        setNdk(ndkInstance);

        const { setGlobalNDKInstance } = await import('@/lib/nostr/ndk-relay-client');
        setGlobalNDKInstance(ndkInstance);
        console.log('✅ Global NDK instance set and available');

        console.log('✅ NDK initialized and ready for signer attachment');
      } catch (error) {
        console.error('❌ Failed to initialize NDK:', error);
      } finally {
        setIsConnecting(false);
        setIsInitializing(false);
      }
    };

    initializeNDK();

    return () => {
      if (ndk) {
        console.log('🧹 Cleaning up NDK connections');
        ndk.pool.close();
      }
    };
  }, []);

  const checkSignerHealth = async (): Promise<boolean> => {
    if (!ndk?.signer) {
      setConnectionStatus(prev => ({
        ...prev,
        isHealthy: false,
        isSignerResponsive: false
      }));
      return false;
    }

    try {
      const pubkey = await Promise.race([
        (ndk.signer as any).user?.() || ndk.signer.getPublicKey?.(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);

      const isHealthy = !!pubkey;
      setConnectionStatus({
        isHealthy,
        lastPingTime: Date.now(),
        isSignerResponsive: isHealthy
      });

      return isHealthy;
    } catch (error) {
      console.warn('⚠️ Signer health check failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isHealthy: false,
        isSignerResponsive: false
      }));
      return false;
    }
  };

  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    keepAliveIntervalRef.current = setInterval(async () => {
      if (ndk?.signer) {
        try {
          await (ndk.signer as any).user?.();
          setConnectionStatus(prev => ({
            ...prev,
            lastPingTime: Date.now(),
            isSignerResponsive: true
          }));
        } catch (error) {
          console.warn('⚠️ Keep-alive ping failed - signer may be unresponsive');
          setConnectionStatus(prev => ({
            ...prev,
            isSignerResponsive: false
          }));
        }
      }
    }, 60000);
  };

  const startHealthMonitoring = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(async () => {
      const timeSinceLastPing = Date.now() - connectionStatus.lastPingTime;

      if (timeSinceLastPing > 90000) { // 90 seconds without response
        console.warn(`⚠️ No signer response for ${Math.floor(timeSinceLastPing / 1000)}s - may be suspended`);
        setConnectionStatus(prev => ({
          ...prev,
          isHealthy: false
        }));
      }
    }, 30000);
  };

  const attachSigner = async (signer: NDKSigner, retryCount: number = 0) => {
    if (!ndk) {
      console.warn('⚠️ NDK not initialized yet, cannot attach signer');
      throw new Error('NDK not initialized');
    }

    console.log('🔑 Attaching signer to existing NDK instance (post-creation)...');
    ndk.signer = signer;

    const authMethod = localStorage.getItem('nostr-auth-method');
    const needsAuthPolicy = authMethod !== 'nip46';

    if (needsAuthPolicy) {
      console.log('🔐 Setting up auth policy for NIP-07/extension authentication...');
      for (const relay of ndk.pool.relays.values()) {
        relay.authPolicy = async (relayInstance, challenge) => {
          try {
            console.log('🔐 Processing auth challenge from:', relayInstance.url, 'challenge:', challenge?.slice(0, 16));

            // Validate challenge
            if (!challenge || typeof challenge !== 'string' || challenge.length < 16) {
              console.warn('⚠️ Invalid challenge received:', challenge);
              throw new Error('Invalid challenge format');
            }

            const { NDKEvent } = await import('@nostr-dev-kit/ndk');
            const authEvent = new NDKEvent(ndk);
            authEvent.kind = 22242;
            authEvent.tags = [
              ["relay", relayInstance.url.replace(/\/$/, '')],
              ["challenge", challenge]
            ];
            authEvent.created_at = Math.floor(Date.now() / 1000);

            console.log('🔐 Signing auth event for:', relayInstance.url);
            await authEvent.sign(ndk.signer!);
            console.log('✅ Auth event signed successfully');

            return authEvent;
          } catch (error) {
            console.error('❌ Auth policy error for relay', relayInstance.url, ':', error);
            // Don't re-throw to avoid breaking the connection flow
            return null;
          }
        };
      }
    }

    try {
      console.log('🔍 Getting user from signer...');
      const userFromSigner = await Promise.race([
        signer.user(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Signer user() timeout')), 6000))
      ]);
      setUser(userFromSigner);
      console.log('✅ Signer attached and user retrieved');
    } catch (error) {
      console.error('❌ Failed to get user from signer:', error);
      throw error;
    }

    console.log('🔌 Reconnecting to relays with newly attached signer...');

    // Force disconnect and reconnect to trigger fresh authentication
    for (const relay of ndk.pool.relays.values()) {
      if (relay.status >= 1) {
        console.log('🔄 Disconnecting relay for fresh auth:', relay.url);
        relay.disconnect();
      }
    }

    // Wait a moment for clean disconnect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reconnect with signer
    await ndk.connect();

    // Give more time for authentication flow (especially for nsec.app)
    const isNsecApp = authMethod === 'nsec' || !authMethod && typeof window !== 'undefined' && window.nostr;
    const waitTime = isNsecApp ? 10000 : 5000; // 10s for nsec.app, 5s for others

    console.log('⏳ Waiting for authentication completion...', { authMethod, waitTime });
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const allRelays = Array.from(ndk.pool.relays.values());
    const connectedRelay = allRelays.find(relay => relay.status >= 1);

    if (connectedRelay) {
      console.log('✅ Successfully reconnected to relay with authentication:', connectedRelay.url);
      setIsConnected(true);

      // Update global NDK instance with the signer-equipped NDK
      const { setGlobalNDKInstance } = await import('@/lib/nostr/ndk-relay-client');
      setGlobalNDKInstance(ndk);
      console.log('✅ Global NDK instance updated with attached signer');

      // Start monitoring for better reliability
      startKeepAlive();
      startHealthMonitoring();
    } else {
      console.warn('⚠️ No relay connection after signer attachment and reconnection');
      throw new Error('Failed to establish authenticated relay connection');
    }
  };

  const publish = async (event: NDKEvent) => {
    if (!ndk) {
      console.warn('⚠️ NDK not initialized yet, cannot publish event');
      throw new Error('NDK not initialized');
    }

    if (!ndk.signer) {
      console.warn('⚠️ No signer attached to NDK, cannot publish event');
      throw new Error('No signer attached to NDK');
    }

    console.log('📤 Publishing event:', event.kind, event.id);

    try {
      await event.publish();
      console.log('✅ Event published successfully');
    } catch (error) {
      console.error('❌ Failed to publish event:', error);
      throw error;
    }
  };

  const subscribe = (filters: any): NDKSubscription | null => {
    if (!ndk) {
      console.warn('⚠️ NDK not initialized yet, cannot create subscription');
      return null;
    }

    console.log('📡 Creating NDK subscription with filters:', filters);
    return ndk.subscribe(filters);
  };

  const value: NDKContextValue = {
    ndk,
    isConnected,
    isConnecting,
    isInitializing,
    user,
    attachSigner,
    publish,
    subscribe,
    checkSignerHealth,
    connectionStatus
  };

  return (
    <NDKContext.Provider value={value}>
      {children}
    </NDKContext.Provider>
  );
}

export function useNDK(): NDKContextValue {
  const context = useContext(NDKContext);
  if (!context) {
    throw new Error('useNDK must be used within an NDKProvider');
  }
  return context;
}