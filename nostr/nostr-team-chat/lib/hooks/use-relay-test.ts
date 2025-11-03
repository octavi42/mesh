import { useEffect } from 'react';
import { useNDK } from './use-ndk';
import { NDKKind } from '@nostr-dev-kit/ndk';

export function useRelayTest() {
  const { ndk } = useNDK();

  useEffect(() => {
    if (!ndk) {
      console.log('🔍 [RelayTest] No NDK available yet');
      return;
    }

    console.log('🧪 [RelayTest] Testing relay connectivity...');

    // Test 1: Subscribe to any kind 38000 events (no user filter)
    const testSub = ndk.subscribe({
      kinds: [38000 as NDKKind],
      limit: 10
    });

    testSub.on('event', (event) => {
      console.log('🎯 [RelayTest] Received kind 38000 event:', {
        id: event.id?.slice(0, 8),
        kind: event.kind,
        pubkey: event.pubkey?.slice(0, 8),
        relay: event.relay?.url,
        groupId: event.tags.find(tag => tag[0] === 'd')?.[1],
        content: event.content?.slice(0, 100)
      });
    });

    testSub.on('eose', () => {
      console.log('✅ [RelayTest] EOSE received - relay is responding');
    });

    testSub.on('close', () => {
      console.log('🔌 [RelayTest] Subscription closed');
    });

    // Test 2: Subscribe to recent metadata events (kind 0)
    const metaTestSub = ndk.subscribe({
      kinds: [0 as NDKKind],
      limit: 3
    });

    metaTestSub.on('event', (event) => {
      console.log('👤 [RelayTest] Received profile event:', {
        pubkey: event.pubkey?.slice(0, 8),
        relay: event.relay?.url
      });
    });

    metaTestSub.on('eose', () => {
      console.log('✅ [RelayTest] Profile EOSE received');
    });

    // Cleanup
    return () => {
      console.log('🧹 [RelayTest] Cleaning up test subscriptions');
      testSub.stop();
      metaTestSub.stop();
    };
  }, [ndk]);
}