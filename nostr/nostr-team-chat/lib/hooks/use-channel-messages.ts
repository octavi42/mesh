import { useEffect, useState } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { NDKKind } from '@nostr-dev-kit/ndk';
import { toast } from 'sonner';

// Helper to detect nsec.app usage
const isNsecAppStorage = (): boolean => {
  const authMethod = localStorage.getItem('nostr-auth-method');
  const hasExtension = typeof window !== 'undefined' && window.nostr;
  return authMethod === 'nsec' || (!authMethod && hasExtension && window.location.hostname !== 'nsec.app');
};

// Adaptive timeout constants - extended for nsec.app service worker wake-up
const CHECK_SIGNER_HEALTH_TIMEOUT = isNsecAppStorage() ? 30000 : 3000;

export interface Message {
  id: string;
  channelId: string;
  content: string;
  authorPubkey: string;
  createdAt: number;
  replyTo?: string;
  isPending?: boolean;
}

const checkSignerHealth = async (ndk: any, checkOnly: boolean = false): Promise<boolean> => {
  if (!ndk?.signer) {
    if (!checkOnly) {
      toast.error('No signer available. Please ensure nsec.app is connected.', {
        description: 'Try refreshing nsec.app if it appears unresponsive.'
      });
    }
    return false;
  }

  try {
    const pubkey = await Promise.race([
      (ndk.signer as any).user?.() || ndk.signer.getPublicKey?.(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CHECK_SIGNER_HEALTH_TIMEOUT))
    ]);

    return !!pubkey;
  } catch (error) {
    if (!checkOnly) {
      console.error('❌ Signer health check failed:', error);
      toast.error('Connection to key storage lost', {
        description: 'nsec.app may have become inactive. Please check the nsec.app tab and reconnect.'
      });
    }
    return false;
  }
};

export function useChannelMessages(channelId: string) {
  const { ndk, publish, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { setLoadingChannel } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🔧 useChannelMessages effect triggered:', {
      channelId,
      hasNdk: !!ndk,
      isConnected,
      hasSigner: !!ndk?.signer,
      ndkStatus: ndk ? 'available' : 'missing'
    });

    // Check if we have the minimum requirements for fetching messages
    if (!ndk || !channelId) {
      console.log('⏭️ Skipping channel messages subscription: missing basic requirements', {
        hasNdk: !!ndk,
        hasChannelId: !!channelId
      });
      return;
    }

    // Check if we have a signer (required for authenticated relay access)
    if (!ndk.signer) {
      console.log('⏭️ Skipping channel messages subscription: no signer attached', {
        hasSigner: !!ndk.signer,
        isConnected,
        message: 'Use "Connect to Relay" button to attach signer and fetch messages'
      });
      return;
    }

    // Add detailed relay status check for debugging
    console.log('🔍 Detailed relay status check:', {
      relays: Array.from(ndk.pool.relays.values()).map(r => ({
        url: r.url,
        status: r.status,
        authenticated: r.authenticated,
        connectivity: r.connectivity?.status
      }))
    });

    console.log('💬 Starting channel messages fetching for channel:', channelId);
    setIsLoading(true);
    setMessages([]); // Clear previous messages

    // Parse channel ID to extract workspace (group) ID and channel name
    // Format: "workspaceId-channelName" e.g. "x6i0xmzzxui-general"
    const parts = channelId.split('-');
    if (parts.length < 2) {
      console.error('❌ Invalid channel ID format:', channelId);
      setIsLoading(false);
      setLoadingChannel(false); // Clear chat store loading state on error
      return;
    }

    const workspaceId = parts[0]; // This is the group ID from NIP-29
    const channelName = parts.slice(1).join('-'); // Channel name (rejoin in case of multiple dashes)

    console.log('💬 Parsed channel info:', {
      channelId,
      workspaceId,
      channelName,
      parts,
      fullChannelId: channelId
    });

    const processDeletionEvent = (event: any) => {
      try {
        console.log('🗑️ LIVE DELETION: Received deletion event:', {
          id: event.id?.slice(0, 8),
          kind: event.kind,
          groupId: event.tags.find((tag: string[]) => tag[0] === 'h')?.[1],
          deletedEventIds: event.tags
            .filter((tag: string[]) => tag[0] === 'e')
            .map((tag: string[]) => tag[1])
            .filter(Boolean),
          relay: event.relay?.url
        });

        // Extract group ID to make sure this deletion applies to our current channel
        const messageGroupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
        if (messageGroupId !== workspaceId) {
          console.log('⏭️ Deletion event not for our workspace, ignoring');
          return;
        }

        // Extract IDs of deleted messages
        const deletedIds = event.tags
          .filter((tag: string[]) => tag[0] === 'e')
          .map((tag: string[]) => tag[1])
          .filter(Boolean);

        if (deletedIds.length > 0) {
          console.log(`🗑️ Removing ${deletedIds.length} deleted messages:`, deletedIds.map(id => id.slice(0, 8)));

          // Remove deleted messages from state
          setMessages(prev => {
            const filteredMessages = prev.filter(msg => !deletedIds.includes(msg.id));
            console.log(`🗑️ Messages before deletion: ${prev.length}, after deletion: ${filteredMessages.length}`);

            // Check if this specific channel is now empty and should be removed
            const currentChannelMessages = filteredMessages.filter(msg => msg.channelId === channelId);
            if (currentChannelMessages.length === 0 && prev.length > 0) {
              console.log('🗑️ Channel is now empty, scheduling channel cleanup');

              // Import and call channel cleanup function
              import('@/lib/hooks/use-channels').then(({ removeEmptyChannel }) => {
                removeEmptyChannel(channelId);
              }).catch(error => {
                console.error('❌ Failed to cleanup empty channel:', error);
              });
            }

            return filteredMessages;
          });
        }
      } catch (error) {
        console.error('❌ Failed to process deletion event:', error);
      }
    };

    const processMessage = (event: any, isLive = false) => {
      try {
        const logPrefix = isLive ? '🔴 LIVE MSG' : '📜 HISTORICAL MSG';

        console.log(`${logPrefix} Received message event:`, {
          id: event.id?.slice(0, 8),
          kind: event.kind,
          groupId: event.tags.find((tag: string[]) => tag[0] === 'h')?.[1],
          channelName: event.tags.find((tag: string[]) => tag[0] === 'c')?.[1],
          author: event.pubkey?.slice(0, 8),
          content: event.content?.slice(0, 50),
          relay: event.relay?.url
        });

        // Extract group ID and channel name from tags
        const messageGroupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
        const messageChannelName = event.tags.find((tag: string[]) => tag[0] === 'c')?.[1] || 'general';

        // Filter messages for this specific group and channel
        if (messageGroupId === workspaceId && messageChannelName === channelName) {
          const message: Message = {
            id: event.id || `${Date.now()}-${Math.random()}`,
            channelId: channelId,
            content: event.content || '',
            authorPubkey: event.pubkey || '',
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            replyTo: event.tags.find((tag: string[]) => tag[0] === 'e')?.[1]
          };

          console.log(`${logPrefix} Adding message to channel:`, {
            messageId: message.id.slice(0, 8),
            channelId: message.channelId,
            author: message.authorPubkey.slice(0, 8),
            content: message.content.slice(0, 30)
          });

          setMessages(prev => {
            // Avoid duplicates - check by ID first, then by content and author for optimistic messages
            const existsById = prev.find(m => m.id === message.id);
            if (existsById) return prev;

            // Also check for optimistic messages that might have the same content and author
            // within a short time window (to catch race conditions)
            const existsByContentAndAuthor = prev.find(m =>
              m.content === message.content &&
              m.authorPubkey === message.authorPubkey &&
              Math.abs(m.createdAt - message.createdAt) < 10000 // within 10 seconds
            );
            if (existsByContentAndAuthor) return prev;

            // Add and sort by timestamp
            const updated = [...prev, message].sort((a, b) => a.createdAt - b.createdAt);
            return updated;
          });
        }
      } catch (error) {
        console.error('❌ Failed to process message event:', error);
      }
    };

    const initializeMessages = async () => {
      try {
        // Small delay to ensure NDK connection status is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check relay status with improved logic
        const allRelays = Array.from(ndk.pool.relays.values());
        console.log('🔍 Checking relay status with improved logic');
        console.log('🔍 Total relays:', allRelays.length);

        if (allRelays.length === 0) {
          console.error('❌ No relays found in NDK pool at all');
          setIsLoading(false);
          setLoadingChannel(false);
          return;
        }

        // Log relay info and check status
        const usableRelays = allRelays.filter(relay => {
          const isUsable = relay.status >= 1 || relay.connectivity?.status === 'connected';
          console.log(`🔍 Relay ${relay.url} status:`, {
            status: relay.status,
            statusName: ['disconnected', 'connecting', 'connected', 'reconnecting', 'error', 'authenticated', 'connected_readonly'][relay.status] || `unknown_${relay.status}`,
            authenticated: relay.authenticated,
            connectivity: relay.connectivity?.status,
            isUsable: isUsable
          });
          return isUsable;
        });
        console.log('✅ Found usable relays:', usableRelays.map(r => r.url));

        // PHASE 1: HISTORICAL MESSAGES FETCH (like working test app)
        console.log('📜 PHASE 1: Fetching historical messages...');

        const filter = {
          kinds: [9, 11] as NDKKind[], // GroupChatMessage (NIP-29) and EncryptedDM
          "#h": [workspaceId], // Filter by group ID
          limit: 50 // Reduce limit to test if it's a performance issue
        };

        // Also fetch deletion events to process deleted messages
        const deletionFilter = {
          kinds: [9005] as NDKKind[], // Message deletion events
          "#h": [workspaceId], // Filter by group ID
          limit: 100
        };

        console.log('📜 Message fetch filter:', JSON.stringify(filter, null, 2));
        console.log('🗑️ Deletion fetch filter:', JSON.stringify(deletionFilter, null, 2));
        console.log('🔍 Channel parsing details:', {
          originalChannelId: channelId,
          parsedWorkspaceId: workspaceId,
          parsedChannelName: channelName,
          filterHTag: filter["#h"],
          deletionFilterHTag: deletionFilter["#h"]
        });

        // Add more detailed authentication debugging
        console.log('🔍 Authentication status before fetch:', {
          userPubkey: pubkey?.slice(0, 8),
          fullPubkey: pubkey,
          ndkSigner: ndk.signer ? 'present' : 'missing',
          relayAuth: Array.from(ndk.pool.relays.values()).map(r => ({
            url: r.url,
            status: r.status,
            authenticated: r.authenticated
          }))
        });

        // Test if the user has access to this specific workspace
        console.log('🔍 Testing workspace access:', {
          workspaceId,
          userPubkey: pubkey,
          testingAccess: true
        });

        // Define timeout utility function that logs warnings instead of errors
        const timeoutPromise = async <T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
              setTimeout(() => {
                console.warn(`⏳ ${description} timed out after ${timeoutMs}ms - relay may be slow`);
                reject(new Error(`${description} timed out after ${timeoutMs}ms`));
              }, timeoutMs)
            )
          ]);
        };

        // Check if user is member of the workspace by querying workspace metadata
        console.log('📋 Checking workspace membership...');
        try {
          const membershipFilter = {
            kinds: [39002] as NDKKind[], // Group members list
            "#h": [workspaceId],
            limit: 1
          };

          const membershipResult = await timeoutPromise(
            ndk.fetchEvents(membershipFilter),
            5000,
            'Workspace membership check'
          );

          console.log('📋 Membership check result:', membershipResult.size, 'events found');

          if (membershipResult.size > 0) {
            const memberEvent = Array.from(membershipResult)[0];
            const members = memberEvent.tags
              .filter((tag: string[]) => tag[0] === 'p')
              .map((tag: string[]) => tag[1]);

            const isMember = members.includes(pubkey || '');
            console.log('👥 User membership status:', {
              isMember,
              totalMembers: members.length,
              userInList: isMember ? 'YES' : 'NO',
              membersList: members.map(m => m.slice(0, 8))
            });
          } else {
            console.log('⚠️ No membership data found - this might be an unmanaged group');
          }
        } catch (membershipError) {
          console.warn('⚠️ Failed to check workspace membership:', membershipError);
        }

        // Add timeout to prevent hanging
        console.log('📡 Starting fetch with 15s timeout...');

        let historicalMessages, deletionEvents;

        const authMethod = localStorage.getItem('nostr-auth-method');
        const needsHealthCheck = authMethod !== 'nip46'; // Skip health check for NIP-46

        // Debug: Print current auth state
        console.log('🔍 Auth debug info:', {
          authMethod,
          hasWindowNostr: !!window.nostr,
          needsHealthCheck,
          hasNdk: !!ndk,
          hasNdkSigner: !!ndk?.signer,
          bunkerToken: localStorage.getItem('nostr-bunker-token')?.slice(0, 20) + '...'
        });

        try {
          console.log('📡 Fetching historical messages...');

          // Check signer health for ALL methods
          // Note: Even NIP-46 (nostr-login) uses a popup initially that can be suspended
          console.log('📡 Checking signer health...');
          if (!(await checkSignerHealth(ndk))) {
            console.error('❌ Signer health check failed - aborting subscription');
            setMessages([]);
            setIsLoading(false);

            const errorMsg = authMethod === 'nip46'
              ? 'Nostr Connect connection lost. Please reconnect.'
              : 'Cannot connect to key storage. Please ensure nsec.app is active.';

            toast.error(errorMsg, {
              description: authMethod === 'nip46'
                ? 'The authorization may have expired. Please log in again.'
                : 'Please ensure key storage is active.'
            });
            return;
          }
          console.log('✅ Signer health check passed');
          console.log('📡 Testing relay connection with simple filter first...');

          // Test 1: Try a very simple filter to see if the relay responds at all
          const testFilter = { kinds: [1] as NDKKind[], limit: 1 };
          console.log('📡 Testing with basic filter:', testFilter);

          try {
            const testResult = await timeoutPromise(
              ndk.fetchEvents(testFilter),
              5000,
              'Basic connectivity test'
            );
            console.log('✅ Basic connectivity test passed:', testResult.size, 'events');
          } catch (testError) {
            console.warn('⚠️ Basic connectivity test failed:', testError);
          }

          // Test 2: Try simplified group filter first
          console.log('📡 Testing simplified group filter...');
          try {
            const simpleGroupFilter = { kinds: [9] as NDKKind[], limit: 5 };
            const simpleGroupResult = await timeoutPromise(
              ndk.fetchEvents(simpleGroupFilter),
              5000,
              'Simple group filter test'
            );
            console.log('✅ Simple group filter test passed:', simpleGroupResult.size, 'events');
          } catch (simpleError) {
            console.warn('⚠️ Simple group filter test failed:', simpleError);
          }

          // Test 3: Now try the actual group filter
          console.log('📡 Fetching historical messages with group filter...');

          // Try alternative method: direct subscription with manual collection
          console.log('📡 Attempting alternative method: manual subscription...');

          try {
            historicalMessages = await new Promise<Set<any>>((resolve, reject) => {
              const messages = new Set();

              // Check relay authentication status before subscribing
              const authenticatedRelays = Array.from(ndk.pool.relays.values())
                .filter(relay => relay.authenticated);

              console.log('🔐 Pre-subscription auth check:', {
                authenticatedRelays: authenticatedRelays.length,
                totalRelays: ndk.pool.relays.size,
                relayDetails: Array.from(ndk.pool.relays.values()).map(r => ({
                  url: r.url,
                  status: r.status,
                  authenticated: r.authenticated
                }))
              });

              if (authenticatedRelays.length === 0) {
                console.warn('⚠️ No authenticated relays - subscription may fail');
                console.warn('💡 This usually means nsec.app is inactive or auth failed');
              }

              const subscription = ndk.subscribe(filter);

              let eoseReceived = false;
              let eventCount = 0;
              const timeout = setTimeout(() => {
                if (!eoseReceived) {
                  console.warn(`⚠️ Manual subscription timed out after 15s (received ${eventCount} events)`);
                  subscription.stop();

                  if (eventCount > 0) {
                    console.log('✅ Received some events, proceeding with partial results');
                    resolve(messages);
                  } else {
                    reject(new Error(`Subscription timed out - no events received (auth status: ${authenticatedRelays.length} relays authenticated)`));
                  }
                }
              }, 15000); // Increased timeout

              subscription.on('event', (event) => {
                eventCount++;
                console.log(`📨 Received event ${eventCount} via manual subscription:`, event.id?.slice(0, 8));
                messages.add(event);
              });

              subscription.on('eose', () => {
                console.log(`✅ EOSE received via manual subscription (${eventCount} events total)`);
                eoseReceived = true;
                clearTimeout(timeout);
                subscription.stop();
                resolve(messages);
              });

              subscription.on('close', (reason) => {
                console.log('🔚 Subscription closed, reason:', reason);
                if (!eoseReceived) {
                  clearTimeout(timeout);

                  if (eventCount > 0) {
                    console.log(`✅ Subscription closed but received ${eventCount} events - proceeding`);
                    resolve(messages);
                  } else {
                    const errorMsg = authenticatedRelays.length === 0
                      ? 'Subscription closed without EOSE - no authenticated relays (key storage may be inactive)'
                      : 'Subscription closed without EOSE';
                    reject(new Error(errorMsg));
                  }
                }
              });

              // Enhanced error handling
              subscription.on('error', (error) => {
                console.error('❌ Subscription error:', error);
                clearTimeout(timeout);

                if (eventCount > 0) {
                  console.log(`✅ Error occurred but received ${eventCount} events - proceeding`);
                  resolve(messages);
                } else {
                  reject(error);
                }
              });

              console.log('📡 Manual subscription started with enhanced error handling');
            });

            console.log('✅ Historical messages fetch completed via manual subscription');
          } catch (manualError) {
            const errorMessage = manualError instanceof Error ? manualError.message : 'Unknown error';
            console.warn('⚠️ Manual subscription issue:', errorMessage);

            // Provide specific guidance for common nsec.app issues (as a single grouped message)
            if (errorMessage.includes('no authenticated relays') || errorMessage.includes('nsec.app may be inactive')) {
              console.warn('💡 Authentication issue detected. Tips: 1) Ensure key storage tab is active 2) Check permissions 3) Try refreshing');
            }

            // Fallback to original fetchEvents method
            console.log('📡 Falling back to fetchEvents...');
            try {
              historicalMessages = await timeoutPromise(
                ndk.fetchEvents(filter),
                15000, // Reduced timeout for fallback
                'Historical messages fetch (fallback)'
              );
              console.log('✅ Historical messages fetch completed via fetchEvents fallback');
            } catch (fallbackError) {
              console.warn('⚠️ Fallback fetch also timed out - relay may be slow or require authentication');
              historicalMessages = new Set(); // Empty set to prevent crashes
            }
          }
        } catch (error) {
          console.error('❌ Historical messages fetch failed:', error);
          historicalMessages = new Set(); // Empty set as fallback
        }

        try {
          console.log('📡 Fetching deletion events...');
          deletionEvents = await timeoutPromise(
            ndk.fetchEvents(deletionFilter),
            10000,
            'Deletion events fetch'
          );
          console.log('✅ Deletion events fetch completed');
        } catch (error) {
          // Timeout for deletion events is not critical - just use empty set
          console.warn('⚠️ Deletion events fetch timed out or failed - proceeding without deletion filtering');
          deletionEvents = new Set(); // Empty set as fallback
        }

        console.log(`📜 Fetched ${historicalMessages.size} historical messages and ${deletionEvents.size} deletion events for group ${workspaceId}:`, {
          filter,
          relayStatuses: Array.from(ndk.pool.relays.values()).map(r => ({
            url: r.url,
            status: r.status,
            authenticated: r.authenticated
          })),
          messagesArray: Array.from(historicalMessages).map(e => ({
            id: e.id?.slice(0, 8),
            kind: e.kind,
            content: e.content?.slice(0, 50),
            tags: e.tags,
            groupId: e.tags.find((tag: string[]) => tag[0] === 'h')?.[1],
            channelName: e.tags.find((tag: string[]) => tag[0] === 'c')?.[1],
            relay: e.relay?.url
          }))
        });

        // Check if we got any messages and log potential issues with specific guidance
        if (historicalMessages.size === 0) {
          console.warn('⚠️ No historical messages fetched. Possible issues:');

          const authenticatedRelays = Array.from(ndk.pool.relays.values())
            .filter(relay => relay.authenticated);
          const connectedRelays = Array.from(ndk.pool.relays.values())
            .filter(relay => relay.status === 1);

          if (authenticatedRelays.length === 0) {
            console.warn('❌ PRIMARY ISSUE: No authenticated relays');
            console.warn('💡 This is usually caused by nsec.app being inactive or unresponsive');
            console.warn('💡 Solutions:');
            console.warn('💡 - Keep nsec.app tab active and visible while using this app');
            console.warn('💡 - Grant permission when nsec.app prompts for signing');
            console.warn('💡 - Refresh nsec.app if it becomes unresponsive');
          } else if (connectedRelays.length === 0) {
            console.warn('❌ Network connectivity issues - no relays connected');
          } else {
            console.warn('- Group ID may be incorrect:', workspaceId);
            console.warn('- No messages exist for this group/channel combination:', channelName);
            console.warn('- User may not have access to this workspace');
          }

          console.warn('🔍 Current relay status:', {
            connected: connectedRelays.length,
            authenticated: authenticatedRelays.length,
            total: ndk.pool.relays.size
          });
        }

        // Build set of deleted message IDs from deletion events
        const deletedMessageIds = new Set<string>();
        deletionEvents.forEach((deleteEvent) => {
          // Extract event IDs from 'e' tags in deletion events
          const deletedIds = deleteEvent.tags
            .filter((tag: string[]) => tag[0] === 'e')
            .map((tag: string[]) => tag[1])
            .filter(Boolean);

          deletedIds.forEach((id) => {
            deletedMessageIds.add(id);
            console.log('🗑️ Message marked as deleted:', id.slice(0, 8));
          });
        });

        console.log(`🗑️ Found ${deletedMessageIds.size} deleted message IDs`);

        let latestTimestamp = 0;

        // Process historical messages, excluding deleted ones
        historicalMessages.forEach((event) => {
          // Skip deleted messages
          if (deletedMessageIds.has(event.id)) {
            console.log('⏭️ Skipping deleted message:', event.id.slice(0, 8));
            return;
          }

          processMessage(event, false);
          if (event.created_at && event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
          }
        });

        console.log('📜 Historical messages processing complete');

        // PHASE 2: LIVE SUBSCRIPTION (like working test app)
        console.log('🔴 PHASE 2: Starting live message subscription...');

        const liveFilter = {
          kinds: [9, 11, 9005] as NDKKind[], // GroupChatMessage, EncryptedDM, and deletion events
          "#h": [workspaceId], // Filter by group ID
          since: latestTimestamp + 1 // Only new messages after historical data
        };

        console.log('🔴 Live subscription filter:', liveFilter);

        const liveSubscription = ndk.subscribe(liveFilter);

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live message subscription - NDK not ready');
          setIsLoading(false);
          setLoadingChannel(false);
          return;
        }

        // Enhanced live subscription with better error handling
        let liveEventCount = 0;

        liveSubscription.on('event', (event) => {
          liveEventCount++;
          console.log(`🔴 Live event ${liveEventCount}:`, event.kind, event.id?.slice(0, 8));

          if (event.kind === 9005) {
            processDeletionEvent(event);
          } else {
            processMessage(event, true);
          }
        });

        liveSubscription.on('eose', () => {
          console.log('✅ Live message subscription EOSE - real-time messages active');
          setIsLoading(false);
          setLoadingChannel(false);
        });

        liveSubscription.on('close', (reason) => {
          console.warn('⚠️ Live subscription closed:', reason);
          // Don't clear loading state here as it might just be a temporary disconnect
          // The subscription will be recreated when the effect re-runs
        });

        liveSubscription.on('error', (error) => {
          console.error('❌ Live subscription error:', error);
          // Log but don't crash - real-time updates just won't work
        });

        // Enhanced cleanup function
        return () => {
          console.log(`🛑 Stopping message subscriptions for channel: ${channelId} (received ${liveEventCount} live events)`);
          try {
            liveSubscription.stop();
            console.log('✅ Live subscription stopped cleanly');
          } catch (error) {
            console.warn('Error stopping message subscription:', error);
          }
        };

      } catch (error) {
        console.error('❌ Failed to fetch messages:', error);
        setIsLoading(false);
        setLoadingChannel(false); // Clear chat store loading state on error
      }
    };

    // Start the two-phase message initialization
    initializeMessages();

    // Return empty cleanup since initializeMessages handles its own cleanup
    return () => {
      console.log('🛑 Cleanup triggered for channel:', channelId);
    };
  }, [ndk, channelId, ndk?.signer]); // Depend on signer instead of isConnected

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!ndk || !pubkey) {
      throw new Error('NDK or user not available');
    }

    // Parse channel ID to get workspace and channel
    const parts = channelId.split('-');
    if (parts.length < 2) {
      throw new Error('Invalid channel ID format');
    }

    const workspaceId = parts[0];
    const channelName = parts.slice(1).join('-');

    console.log('📤 Sending message:', { workspaceId, channelName, content: content.slice(0, 30) });

    // STEP 1: IMMEDIATE optimistic update with loading state
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      channelId,
      content,
      authorPubkey: pubkey,
      createdAt: Date.now(),
      replyTo,
      isPending: true
    };

    // Add optimistic message immediately
    setMessages(prev => {
      const updated = [...prev, optimisticMessage].sort((a, b) => a.createdAt - b.createdAt);
      return updated;
    });

    // STEP 2: Handle actual sending in background
    try {
      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const messageEvent = new NDKEvent(ndk);
      messageEvent.kind = 9; // GroupChatMessage (NIP-29)
      messageEvent.content = content;
      messageEvent.tags = [
        ['h', workspaceId], // Group ID
        ['c', channelName]  // Channel name
      ];

      if (replyTo) {
        messageEvent.tags.push(['e', replyTo]);
      }

      await messageEvent.sign();
      await messageEvent.publish();

      // Update the optimistic message with the real event ID to prevent duplicates
      // from the live subscription, but keep everything else the same to avoid flickering
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, id: messageEvent.id || tempId }
            : msg
        )
      );

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));

      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to send message: ${errorMessage}`);

      // Don't throw error to prevent breaking the UI
    }
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
}
