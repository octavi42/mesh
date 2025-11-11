'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import NDK, { NDKEvent, NDKSigner, NDKUser } from '@nostr-dev-kit/ndk';
import { NDKSubscription } from '@nostr-dev-kit/ndk';

interface NDKContextValue {
  ndk: NDK | null;
  isConnected: boolean;
  isConnecting: boolean;
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

        let signer = null;

        // Check for existing auth session
        const storedPubkey = localStorage.getItem('nostr-pubkey');
        const authMethod = localStorage.getItem('nostr-auth-method');
        const hasExtension = typeof window !== 'undefined' && window.nostr;

        // Create signer if we have an active session (like test app does)
        if (authMethod === 'extension' && hasExtension) {
          const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
          signer = new NDKNip07Signer();
          console.log('🔑 Created NDKNip07Signer for extension auth');
        } else if (authMethod === 'nip46') {
          const storedBunkerToken = localStorage.getItem('nostr-bunker-token');
          if (storedBunkerToken && storedPubkey) {
            const prelude = await import('@nostr-dev-kit/ndk');
            const { NDKNip46Signer } = prelude;
            signer = new NDKNip46Signer(new NDK({ explicitRelayUrls: relayUrls }), storedPubkey, storedBunkerToken);
            console.log('🔑 Created NDKNip46Signer for NIP-46 auth');
          }
        } else if (!authMethod && hasExtension) {
          // No stored method but extension available - this is nsec.app
          const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
          signer = new NDKNip07Signer();
          console.log('🔑 Created NDKNip07Signer for nsec.app (detected)');
        }

        // Create NDK instance WITH signer attached (this is the key difference)
        const ndkInstance = new NDK({
          explicitRelayUrls: relayUrls,
          outboxRelayUrls: relayUrls,
          signer: signer, // Attach signer IMMEDIATELY
        });

        // Set up basic event listeners
        ndkInstance.pool.on('relay:connect', (relay) => {
          console.log('✅ NDK connected to relay:', relay.url);
        });

        ndkInstance.pool.on('relay:disconnect', (relay) => {
          console.log('❌ NDK disconnected from relay:', relay.url);
        });

        ndkInstance.pool.on('relay:error', (relay, error) => {
          console.error('🚨 NDK relay error:', relay.url, error);
        });

        ndkInstance.pool.on('relay:auth', async (relay, challenge) => {
          console.log('🔐 NDK AUTH challenge from relay:', relay.url, 'challenge:', challenge?.slice(0, 16));
        });

        // Connect immediately if we have a signer (like test app)
        if (signer) {
          console.log('🔌 Connecting to relays with pre-attached signer...');
          await ndkInstance.connect();

          // Give it time for authentication (test app uses 3000ms)
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check connection status
          const allRelays = Array.from(ndkInstance.pool.relays.values());
          const connectedRelay = allRelays.find(relay => relay.status === 1);

          if (connectedRelay) {
            console.log('✅ Successfully connected to relay:', connectedRelay.url);
            setIsConnected(true);

            // Try to get user from signer
            try {
              const user = await signer.user();
              setUser(user);
              console.log('✅ User retrieved from signer:', user.pubkey.slice(0, 8));
            } catch (error) {
              console.warn('⚠️ Could not get user from signer:', error);
            }
          } else {
            console.warn('⚠️ No connected relays after initial connection attempt');
          }
        }

        setNdk(ndkInstance);

        const { setGlobalNDKInstance } = await import('@/lib/nostr/ndk-relay-client');
        setGlobalNDKInstance(ndkInstance);

        console.log('✅ NDK initialized with signer-first approach');
      } catch (error) {
        console.error('❌ Failed to initialize NDK:', error);
      } finally {
        setIsConnecting(false);
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
        relay.authPolicy = async (relay, challenge) => {
          try {
            const { NDKEvent } = await import('@nostr-dev-kit/ndk');
            const authEvent = new NDKEvent(ndk);
            authEvent.kind = 22242;
            authEvent.tags = [
              ["relay", relay.url.replace(/\/$/, '')],
              ["challenge", challenge]
            ];
            authEvent.created_at = Math.floor(Date.now() / 1000);
            await authEvent.sign(ndk.signer!);
            return authEvent;
          } catch (error) {
            console.error('❌ Auth policy error:', error);
            throw error;
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

    console.log('🔌 Connecting to relays with newly attached signer...');
    await ndk.connect();
    await new Promise(resolve => setTimeout(resolve, 3000));

    const allRelays = Array.from(ndk.pool.relays.values());
    const connectedRelay = allRelays.find(relay => relay.status === 1);

    if (connectedRelay) {
      console.log('✅ Connected to relay after signer attachment:', connectedRelay.url);
      setIsConnected(true);
    } else {
      console.warn('⚠️ No relay connection after signer attachment');
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