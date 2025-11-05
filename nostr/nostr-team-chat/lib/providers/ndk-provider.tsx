'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const NDKContext = createContext<NDKContextValue | null>(null);

interface NDKProviderProps {
  children: ReactNode;
  relayUrls?: string[];
}

export function NDKProvider({
  children,
  relayUrls = [
    'wss://groups.contextio.app'
  ]
}: NDKProviderProps) {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<NDKUser | null>(null);

  useEffect(() => {
    const initializeNDK = async () => {
      console.log('🔧 Initializing NDK (without connecting to relays yet)');
      setIsConnecting(true);

      try {
        // Create NDK instance but don't connect yet since groups.contextio.app requires auth
        const ndkInstance = new NDK({
          explicitRelayUrls: relayUrls,
          outboxRelayUrls: relayUrls,
        });

        // Set up event listeners
        ndkInstance.pool.on('relay:connect', (relay) => {
          console.log('✅ NDK connected to relay:', relay.url);

          // Set up explicit auth policy like the working groups_relay implementation
          relay.authPolicy = async (relay, challenge) => {
            try {
              console.log('🔐 Custom auth policy triggered for:', relay.url, 'challenge:', challenge?.slice(0, 16));

              // Get the signer from the NDK instance
              const signer = ndkInstance.signer;
              if (!signer) {
                console.warn('⚠️ No signer available for auth yet - auth will be retried when signer is attached');
                throw new Error("No signer available");
              }

              console.log('🔐 Signer found, creating auth event...');

              // Create an auth event
              const { NDKEvent } = await import('@nostr-dev-kit/ndk');
              const authEvent = new NDKEvent(ndkInstance);
              authEvent.kind = 22242;

              // Remove trailing slash from relay URL to match server expectations
              const cleanRelayUrl = relay.url.replace(/\/$/, '');

              authEvent.tags = [
                ["relay", cleanRelayUrl],
                ["challenge", challenge]
              ];
              authEvent.created_at = Math.floor(Date.now() / 1000);

              // Sign the event
              await authEvent.sign(signer);

              console.log('🔐 Auth event created and signed:', authEvent.id?.slice(0, 8));

              // Return the signed event
              return authEvent;
            } catch (error) {
              console.error("❌ Auth policy error:", error);
              throw error;
            }
          };
        });

        ndkInstance.pool.on('relay:disconnect', (relay) => {
          console.log('❌ NDK disconnected from relay:', relay.url);
        });

        ndkInstance.pool.on('relay:error', (relay, error) => {
          console.error('🚨 NDK relay error:', relay.url, error);
        });

        ndkInstance.pool.on('relay:auth', async (relay, challenge) => {
          console.log('🔐 NDK AUTH challenge from relay:', relay.url, 'challenge:', challenge?.slice(0, 16));
          console.log('🔐 Relay status before auth:', relay.status);
          console.log('🔐 NDK signer available:', !!ndkInstance.signer);
          console.log('🔐 Relay object details:', {
            url: relay.url,
            status: relay.status,
            hasConnectivity: !!relay.connectivity,
            connectivityStatus: relay.connectivity?.status,
            hasAuth: !!relay.auth,
            hasSocket: !!relay.socket
          });

          // Auth policy should handle this automatically now
          console.log('🔐 Auth policy should handle authentication...');

          // Check if auth was successful
          setTimeout(() => {
            console.log('🔐 Relay status after auth delay:', relay.status);
            console.log('🔐 Final relay state:', {
              status: relay.status,
              connectivity: relay.connectivity?.status,
              authenticated: relay.authenticated
            });
          }, 3000);
        });

        // Don't connect to relays yet - wait for signer to be attached
        setNdk(ndkInstance);
        console.log('✅ NDK initialized (ready for signer attachment)');
      } catch (error) {
        console.error('❌ Failed to initialize NDK:', error);
      } finally {
        setIsConnecting(false);
      }
    };

    initializeNDK();

    // Cleanup on unmount
    return () => {
      if (ndk) {
        console.log('🧹 Cleaning up NDK connections');
        ndk.pool.close();
      }
    };
  }, []);

  const attachSigner = async (signer: NDKSigner) => {
    if (!ndk) {
      console.warn('⚠️ NDK not initialized yet, cannot attach signer');
      return;
    }

    console.log('🔑 Attaching signer to NDK');
    ndk.signer = signer;

    // Get user from signer
    const userFromSigner = await signer.user();
    setUser(userFromSigner);

    console.log('✅ Signer attached, user:', userFromSigner.pubkey.slice(0, 8));

    // Now connect to relays with authentication capability
    console.log('🔌 Connecting to relays with authentication...');
    console.log('🔐 Signer check before connect:', !!ndk.signer);
    console.log('🔐 User check before connect:', !!userFromSigner);

    try {
      await ndk.connect();

      // Force reconnection to trigger auth with signer now available
      console.log('🔐 Forcing relay reconnection with signer available...');
      const relays = Array.from(ndk.pool.relays.values());
      for (const relay of relays) {
        if (relay.status !== 1) { // Not connected
          try {
            console.log('🔄 Reconnecting to relay:', relay.url);
            await relay.connect();
          } catch (error) {
            console.warn('⚠️ Failed to reconnect to relay:', relay.url, error);
          }
        }
      }

      // Wait for actual authentication, not just connection
      console.log('🔐 Waiting for relay authentication...');

      const authPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('❌ Authentication timeout after 10 seconds');
          reject(new Error('Authentication timeout'));
        }, 10000);

        const checkAuth = () => {
          const allRelays = Array.from(ndk.pool.relays.values());
          console.log('🔍 Checking relay authentication status:', allRelays.map(r => ({
            url: r.url,
            status: r.status,
            authenticated: r.authenticated
          })));

          // Look for authenticated relay (status 5 = READY/authenticated)
          const authRelay = allRelays.find(r => r.status === 5);

          if (authRelay) {
            console.log('✅ Relay authenticated successfully:', authRelay.url, 'Status:', authRelay.status);
            clearTimeout(timeout);
            resolve();
          }
        };

        // Listen for authentication events
        ndk.pool.on('relay:auth', () => {
          console.log('🔐 Auth event received, checking status...');
          setTimeout(checkAuth, 100); // Small delay to let status update
        });

        // Also listen for direct authentication success
        ndk.pool.on('relay:authed', (relay) => {
          console.log('🔐 Relay authenticated event:', relay.url);
          clearTimeout(timeout);
          resolve();
        });

        // Check immediately in case already authenticated
        checkAuth();

        // Also check periodically during the timeout period
        const checkInterval = setInterval(() => {
          checkAuth();
        }, 500);

        // Clear interval when done
        const originalResolve = resolve;
        const originalReject = reject;
        resolve = (...args) => {
          clearInterval(checkInterval);
          originalResolve(...args);
        };
        reject = (...args) => {
          clearInterval(checkInterval);
          originalReject(...args);
        };
      });

      await authPromise;
      setIsConnected(true);
      console.log('✅ Successfully connected and authenticated to relays');

    } catch (error) {
      console.error('❌ Failed to connect or authenticate to relays:', error);
      setIsConnected(false);
      throw error;
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