// Comprehensive debug script to diagnose fetching issues
// Run this in browser console

async function debugFullFetching() {
  console.log('🔍 Full fetching diagnosis starting...');
  console.log('=' .repeat(60));

  try {
    // STEP 1: Check basic auth state
    console.log('\n1️⃣ AUTHENTICATION STATE:');

    const authMethod = localStorage.getItem('nostr-auth-method');
    const pubkey = localStorage.getItem('nostr-pubkey');
    console.log(`- Auth method: ${authMethod}`);
    console.log(`- Stored pubkey: ${pubkey?.slice(0, 16)}...`);

    // STEP 2: Check NDK provider state
    console.log('\n2️⃣ NDK PROVIDER STATE:');

    // Check if window stores exist
    const stores = window.__STORES__;
    console.log(`- Window stores available: ${!!stores}`);

    if (stores) {
      const auth = stores.auth || {};
      console.log(`- Auth store pubkey: ${auth.pubkey?.slice(0, 16)}...`);
      console.log(`- Auth store isAuthenticated: ${auth.isAuthenticated}`);
    }

    // STEP 3: Check NDK instance
    console.log('\n3️⃣ NDK INSTANCE STATUS:');

    const { getGlobalNDKClient, isGlobalNDKClientInitialized } = await import('./lib/nostr/ndk-relay-client.ts');
    console.log(`- Global NDK client initialized: ${isGlobalNDKClientInitialized()}`);

    if (isGlobalNDKClientInitialized()) {
      const client = getGlobalNDKClient();
      console.log(`- Client has NDK instance: ${!!(client as any).ndkInstance}`);

      if ((client as any).ndkInstance) {
        const ndk = (client as any).ndkInstance;
        console.log(`- NDK has signer: ${!!ndk.signer}`);
        console.log(`- NDK relay count: ${ndk.pool.relays.size}`);

        // Check relay connections
        let connectedRelays = 0;
        let authenticatedRelays = 0;

        for (const relay of ndk.pool.relays.values()) {
          const isConnected = relay.status >= 1;
          const isAuthenticated = relay.status >= 5 || relay.authenticated === true;

          if (isConnected) connectedRelays++;
          if (isAuthenticated) authenticatedRelays++;

          console.log(`  - ${relay.url}: status=${relay.status}, connected=${isConnected}, auth=${isAuthenticated}`);
        }

        console.log(`- Connected relays: ${connectedRelays}/${ndk.pool.relays.size}`);
        console.log(`- Authenticated relays: ${authenticatedRelays}/${ndk.pool.relays.size}`);
      }
    }

    // STEP 4: Test direct workspace fetch
    console.log('\n4️⃣ DIRECT WORKSPACE FETCH TEST:');

    try {
      const client = getGlobalNDKClient();
      const ndk = (client as any).ndkInstance;

      if (ndk && ndk.signer) {
        console.log('Testing direct workspace events fetch...');

        const workspaceEvents = await ndk.fetchEvents({
          kinds: [39000, 39001, 39002, 9007],
          limit: 20
        });

        console.log(`✅ Found ${workspaceEvents.size} workspace events`);

        if (workspaceEvents.size > 0) {
          console.log('Sample events:');
          Array.from(workspaceEvents).slice(0, 3).forEach((event, i) => {
            console.log(`  ${i + 1}. Kind ${event.kind}, ID: ${event.id?.slice(0, 8)}, Tags: ${event.tags.length}`);
          });
        }
      } else {
        console.log('❌ Cannot test fetch - NDK or signer not available');
      }
    } catch (fetchError) {
      console.error('❌ Direct fetch failed:', fetchError.message);
    }

    // STEP 5: Check workspace store and hook
    console.log('\n5️⃣ WORKSPACE STORE AND HOOK:');

    const workspaceStore = window.__STORES__?.workspace;
    if (workspaceStore) {
      const { workspaces, isLoading, error } = workspaceStore;
      console.log(`- Workspaces in store: ${workspaces?.length || 0}`);
      console.log(`- Store loading state: ${isLoading}`);
      console.log(`- Store error: ${error || 'none'}`);

      if (workspaces && workspaces.length > 0) {
        console.log('Sample workspaces:');
        workspaces.slice(0, 3).forEach((ws, i) => {
          console.log(`  ${i + 1}. ${ws.name} (${ws.id})`);
        });
      }
    } else {
      console.log('❌ Workspace store not found in window.__STORES__');
    }

    // STEP 6: Test workspace hook manually
    console.log('\n6️⃣ MANUAL WORKSPACE HOOK TEST:');

    try {
      const { forceRefreshWorkspaces } = await import('./lib/hooks/use-nip29-workspaces.ts');
      console.log('Triggering manual workspace refresh...');

      forceRefreshWorkspaces();

      console.log('Waiting 5 seconds for results...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check results
      const workspaceStore = window.__STORES__?.workspace;
      if (workspaceStore) {
        const { workspaces } = workspaceStore;
        console.log(`After refresh: ${workspaces?.length || 0} workspaces`);
      }
    } catch (refreshError) {
      console.error('❌ Manual refresh failed:', refreshError.message);
    }

    // STEP 7: Check for specific workspace
    console.log('\n7️⃣ SPECIFIC WORKSPACE CHECK:');

    try {
      const client = getGlobalNDKClient();
      const ndk = (client as any).ndkInstance;

      if (ndk) {
        console.log('Testing fetch for dlpnklmeoft workspace...');

        // Try fetching messages for dlpnklmeoft
        const dlpnklmeoftMessages = await ndk.fetchEvents({
          kinds: [9],
          '#h': ['dlpnklmeoft'],
          limit: 10
        });

        console.log(`Messages for dlpnklmeoft: ${dlpnklmeoftMessages.size}`);

        // Try fetching metadata for dlpnklmeoft
        const dlpnklmeoftMeta = await ndk.fetchEvents({
          kinds: [39000],
          '#h': ['dlpnklmeoft'],
          limit: 1
        });

        console.log(`Metadata for dlpnklmeoft: ${dlpnklmeoftMeta.size}`);

        if (dlpnklmeoftMeta.size > 0) {
          const metaEvent = Array.from(dlpnklmeoftMeta)[0];
          console.log(`Metadata content: ${metaEvent.content?.slice(0, 100)}`);
        }
      }
    } catch (specificError) {
      console.error('❌ Specific workspace test failed:', specificError.message);
    }

    // STEP 8: Check database state
    console.log('\n8️⃣ LOCAL DATABASE STATE:');

    try {
      const { db } = await import('./lib/db/schema.ts');

      const localWorkspaces = await db.nip29Workspaces.toArray();
      const localChannels = await db.channels.toArray();
      const localMessages = await db.messages.toArray();

      console.log(`- Local workspaces: ${localWorkspaces.length}`);
      console.log(`- Local channels: ${localChannels.length}`);
      console.log(`- Local messages: ${localMessages.length}`);

      if (localChannels.length > 0) {
        const channelsByWorkspace = {};
        localChannels.forEach(ch => {
          if (!channelsByWorkspace[ch.workspaceId]) {
            channelsByWorkspace[ch.workspaceId] = [];
          }
          channelsByWorkspace[ch.workspaceId].push(ch.name);
        });

        console.log('Channels by workspace:');
        Object.entries(channelsByWorkspace).forEach(([wsId, channels]) => {
          console.log(`  ${wsId}: ${channels.join(', ')}`);
        });
      }
    } catch (dbError) {
      console.error('❌ Database check failed:', dbError.message);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Diagnosis complete! Check the results above for issues.');

  } catch (error) {
    console.error('❌ Full diagnosis failed:', error);
  }
}

console.log('🚀 Starting comprehensive fetching diagnosis...');
debugFullFetching();