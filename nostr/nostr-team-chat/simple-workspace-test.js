// Simple workspace fetching test
// Run this in browser console to test basic functionality

async function simpleWorkspaceTest() {
  console.log('🧪 Simple workspace fetching test...');

  try {
    // Check if we can get the NDK client
    const { getGlobalNDKClient, isGlobalNDKClientInitialized } = await import('./lib/nostr/ndk-relay-client.ts');

    console.log('NDK Client initialized:', isGlobalNDKClientInitialized());

    if (!isGlobalNDKClientInitialized()) {
      console.log('❌ NDK client not initialized - this is the problem!');
      return;
    }

    const client = getGlobalNDKClient();
    const ndk = (client as any).ndkInstance;

    if (!ndk) {
      console.log('❌ NDK instance not available');
      return;
    }

    console.log('NDK instance available:', !!ndk);
    console.log('NDK has signer:', !!ndk.signer);
    console.log('NDK relay count:', ndk.pool.relays.size);

    // Test basic event fetching
    console.log('🔍 Testing basic event fetch...');

    try {
      const events = await ndk.fetchEvents({
        kinds: [39000], // Group metadata
        limit: 5
      });

      console.log('✅ Basic fetch successful, found', events.size, 'events');

      if (events.size > 0) {
        console.log('Sample events:');
        Array.from(events).slice(0, 3).forEach((event, i) => {
          console.log(`  ${i + 1}. ID: ${event.id?.slice(0, 8)}, Tags:`, event.tags);
        });
      }

    } catch (fetchError) {
      console.error('❌ Basic fetch failed:', fetchError);
    }

    // Test workspace hook manually
    console.log('\n🔧 Testing workspace hook manually...');

    try {
      // Get auth state
      const authStore = window.__STORES__?.auth;
      console.log('Auth store pubkey:', authStore?.pubkey?.slice(0, 16));
      console.log('Auth store isAuthenticated:', authStore?.isAuthenticated);

      if (!authStore?.pubkey) {
        console.log('❌ No pubkey in auth store - authentication issue!');
        return;
      }

      // Check workspace store before
      const workspaceStore = window.__STORES__?.workspace;
      console.log('Workspaces before:', workspaceStore?.workspaces?.length || 0);

      // Try to manually trigger the workspace hook logic
      const { useWorkspaceStore } = await import('./lib/stores/workspace-store-clean.ts');
      const store = useWorkspaceStore.getState();

      console.log('Workspace store state:');
      console.log('- workspaces:', store.workspaces.length);
      console.log('- isLoading:', store.loading);
      console.log('- error:', store.error);

      // Try fetching specific dlpnklmeoft data
      console.log('\n🎯 Testing dlpnklmeoft specifically...');

      const dlpnklmeoftEvents = await ndk.fetchEvents({
        kinds: [39000, 39001, 39002, 9007],
        '#h': ['dlpnklmeoft'],
        limit: 10
      });

      console.log('dlpnklmeoft events found:', dlpnklmeoftEvents.size);

      if (dlpnklmeoftEvents.size === 0) {
        console.log('⚠️ No events found for dlpnklmeoft - might be auth issue or wrong ID format');

        // Try without the specific group filter
        const allEvents = await ndk.fetchEvents({
          kinds: [39000],
          limit: 20
        });

        console.log('All group metadata events:', allEvents.size);

        if (allEvents.size > 0) {
          console.log('Available group IDs:');
          Array.from(allEvents).forEach(event => {
            const groupId = event.tags.find(tag => tag[0] === 'h' || tag[0] === 'd')?.[1];
            if (groupId) {
              console.log(`  - ${groupId}`);
            }
          });
        }
      }

    } catch (hookError) {
      console.error('❌ Workspace hook test failed:', hookError);
    }

  } catch (error) {
    console.error('❌ Simple test failed:', error);
  }
}

console.log('🚀 Running simple workspace test...');
simpleWorkspaceTest();