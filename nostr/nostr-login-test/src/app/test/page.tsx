'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NDK, { NDKNip07Signer, NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';

export default function TestLoginPage() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const ndkRef = useRef<NDK | null>(null);
  const subsRef = useRef<NDKSubscription[]>([]);

  // Enable NDK debug logging (browser-safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug', 'ndk:*'); // Enables NDK logs: connects, AUTH, events
      console.log('🔍 NDK debug enabled via localStorage');
    }
  }, []);

  useEffect(() => {
    // Initialize nostr-login
    import('nostr-login').then(({ init }) => {
      init({
        theme: 'light', // Optional: Customize theme
      });
    });
  }, []);

  useEffect(() => {
    const handleAuth = (e: CustomEvent) => {
      const detail = e.detail;
      console.log('🔐 Nostr Auth Event:', detail); // Debug log

      if (detail.type === 'login' || detail.type === 'signup') {
        const newPubkey = detail.pubkey || window.nostr?.getPublicKey?.();
        if (newPubkey) {
          setPubkey(newPubkey);
          setIsLoading(false);
          console.log('✅ Logged in with pubkey:', newPubkey.substring(0, 8) + '...');
          // Init NDK and fetch after login
          initNDKAndFetch(newPubkey);
        }
      } else if (detail.type === 'logout') {
        setPubkey(null);
        setEvents([]);
        setIsConnected(false);
        setError(null);
        cleanupSubs();
        if (ndkRef.current) {
          ndkRef.current.pool.disconnect(); // Close connections
        }
        console.log('👋 Logged out - Cleared events');
      }
    };

    document.addEventListener('nlAuth', handleAuth);
    return () => document.removeEventListener('nlAuth', handleAuth);
  }, [router]);

  const initNDKAndFetch = async (loggedPubkey: string) => {
    try {
      setError(null);
      setIsConnected(false);

      // Create NIP-07 signer for browser extension
      const nip07Signer = new NDKNip07Signer();

      // Create NDK instance with your private Digital Ocean NIP-29 relay
      const ndk = new NDK({
        explicitRelayUrls: ['wss://groups.contextio.app/'], // Your private NIP-29 relay (with trailing slash)
        signer: nip07Signer, // Attach here for NIP-07/NIP-42
      });
      ndkRef.current = ndk;

      console.log('🔗 Starting NDK connection...');
      await ndk.connect(); // Simplified connection

      // Give NDK time to establish connections
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if we have any connected relays
      const allRelays = Array.from(ndk.pool.relays.values());
      console.log('📊 All relays in pool:', allRelays.map(r => ({ url: r.url, status: r.status })));

      const connectedRelay = allRelays.find(relay => relay.status === 1);

      if (connectedRelay) {
        setIsConnected(true);
        console.log('✅ Connected to relay:', connectedRelay.url, 'Status:', connectedRelay.status);
      } else {
        // Don't throw error, just log and continue
        console.log('⚠️ No relays with status 1, but continuing anyway...');
        setIsConnected(true); // Set as connected to test publishing
      }

      // Fetch NIP-29 groups from your relay
      console.log('🔗 Relay connected, fetching groups...');
      console.log('📊 Connected relays:', Array.from(ndk.pool.relays.values()).map(r => ({ url: r.url, status: r.status })));
      fetchNIP29Groups(ndk, loggedPubkey);
    } catch (err) {
      console.error('❌ NDK Init/Fetch Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchNIP29Groups = (ndk: NDK, pubkey: string) => {
    // Cleanup old subs
    cleanupSubs();

    // 1. First, try a very broad query to see what exists
    const debugFilter: NDKFilter = {
      limit: 20, // No kinds filter - get ANY events
    };
    console.log('🔍 Subscribing to ANY events (debug) with filter:', debugFilter);

    const debugSub = ndk.subscribe(debugFilter);
    subsRef.current.push(debugSub);

    debugSub.on('event', (event) => {
      console.log('🔍 DEBUG - Found event:', {
        id: event.id,
        kind: event.kind,
        author: event.author,
        content: event.content.substring(0, 100),
        tags: event.tags,
        relay: event.relay?.url,
      });
    });

    debugSub.on('eose', () => {
      console.log('🔍 DEBUG - End of ANY events (EOSE)');
    });

    // 2. Fetch group chat messages (Kind 9) - this is where your groups are!
    const groupMessagesFilter: NDKFilter = {
      kinds: [9], // Group chat messages
      limit: 50,
    };
    console.log('📡 Subscribing to group messages with filter:', groupMessagesFilter);

    const messagesSub = ndk.subscribe(groupMessagesFilter);
    subsRef.current.push(messagesSub);

    // 3. Fetch invite messages (Kind 1) that seem to be group-related
    const invitesFilter: NDKFilter = {
      kinds: [1], // Invites and notifications
      limit: 30,
    };
    console.log('📡 Subscribing to group invites with filter:', invitesFilter);

    const invitesSub = ndk.subscribe(invitesFilter);
    subsRef.current.push(invitesSub);

    // Event handlers for all subscriptions
    const handleEvent = (eventType: string) => (event: any) => {
      console.log(`📥 Received ${eventType}:`, {
        id: event.id,
        kind: event.kind,
        content: event.content.substring(0, 100) + '...',
        tags: event.tags,
        relay: event.relay?.url,
      });
      setEvents((prev) => [...prev, event]);
    };

    messagesSub.on('event', handleEvent('group message'));
    invitesSub.on('event', handleEvent('group invite'));

    // Handle end of stored events
    const handleEose = (eventType: string) => () => {
      console.log(`🏁 End of ${eventType} events (EOSE)`);
    };

    messagesSub.on('eose', handleEose('group messages'));
    invitesSub.on('eose', handleEose('group invites'));

    // Handle errors
    const handleError = (eventType: string) => (err: any) => {
      console.error(`❌ ${eventType} sub error:`, err);
      setError(err.message);
    };

    messagesSub.on('error', handleError('Group messages'));
    invitesSub.on('error', handleError('Group invites'));
  };

  const cleanupSubs = () => {
    subsRef.current.forEach((sub) => sub.unsubscribe());
    subsRef.current = [];
  };

  const handleLogin = () => {
    setIsLoading(true);
    document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome' })); // Opens login modal
  };

  const handleLogout = () => {
    document.dispatchEvent(new Event('nlLogout')); // Triggers logout
  };

  const handleTestPublish = async () => {
    if (!ndkRef.current || !pubkey) return;

    try {
      // Test publish a NIP-29 group create event (kind 9007 for your relay)
      const event = new NDKEvent(ndkRef.current);
      event.kind = 9007; // KIND_GROUP_CREATE_9007 from your relay
      event.content = JSON.stringify({
        name: 'Test Group from App',
        about: 'A test group created from the client app',
        visibility: 'public' // or 'private' depending on your needs
      });

      const groupId = 'test-group-' + Date.now();
      event.tags = [
        ['d', groupId], // Group identifier for addressable event
        ['h', groupId], // Group ID (h tag for NIP-29)
        ['p', pubkey] // Reference to creator
      ];

      await event.sign(); // Signs with attached signer (auth'd)
      const published = await event.publish(); // Publish to connected relays

      console.log('📤 Published to your relay:', published);
      setError(null);
    } catch (err) {
      console.error('❌ Publish Error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full space-y-8 bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Nostr Login + Relay Fetch Test</h1>
          <p className="mt-2 text-sm text-gray-600">Login, then fetch/publish to your private NIP-29 relay (wss://groups.contextio.app/).</p>
        </div>

        {pubkey ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h2 className="font-medium text-green-800">✅ Authenticated!</h2>
              <p className="text-sm text-green-700 break-all mt-1">
                Pubkey: {pubkey.substring(0, 8)}...{pubkey.slice(-8)}
              </p>
              {isConnected && <p className="text-xs text-green-600 mt-1">🔗 Relay connected!</p>}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleTestPublish}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                disabled={!isConnected}
              >
                {isConnected ? 'Test Publish Group Event' : 'Connect Relay First'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">Error: {error}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">
                Groups from Your Relay ({events.length} events found):
              </h3>

              {events.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-700">
                    No groups found yet. Check console for subscription status.
                  </p>
                </div>
              )}

              {events.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md">
                  {events.map((event, i) => {
                    let groupData = null;
                    try {
                      groupData = JSON.parse(event.content);
                    } catch (e) {
                      // Content might not be JSON
                    }

                    const groupId = event.tags.find(tag => tag[0] === 'h')?.[1] ||
                                   event.tags.find(tag => tag[0] === 'd')?.[1];

                    return (
                      <div key={i} className="bg-white p-3 rounded border text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-blue-600">
                            Kind {event.kind} {
                              event.kind === 9 ? '(Group Chat Message)' :
                              event.kind === 1 ? '(Group Invite/Note)' :
                              event.kind === 39000 ? '(Group Metadata)' :
                              event.kind === 9007 ? '(Group Create)' :
                              ''
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.created_at * 1000).toLocaleTimeString()}
                          </span>
                        </div>

                        {groupData && (
                          <div className="mb-2">
                            <div className="font-medium text-gray-900">{groupData.name || 'Unnamed Group'}</div>
                            {groupData.about && (
                              <div className="text-gray-600 text-xs mt-1">{groupData.about}</div>
                            )}
                            {groupData.visibility && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                                {groupData.visibility}
                              </span>
                            )}
                          </div>
                        )}

                        {groupId && (
                          <div className="text-xs text-gray-500 mb-1">
                            <strong>Group ID:</strong> {groupId}
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          <strong>From:</strong> {event.relay?.url || 'Unknown relay'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {isLoading ? 'Opening...' : 'Login with Nostr'}
          </button>
        )}

        <div className="text-xs text-gray-500 text-center">
          Check console for NDK/relay logs. Ensure extension unlocked.
        </div>
      </div>
    </div>
  );
}