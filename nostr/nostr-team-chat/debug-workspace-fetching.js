// Debug workspace fetching issues
// Run this in browser console after logging in

async function debugWorkspaceFetching() {
  console.log('🔍 Debugging workspace fetching...');

  try {
    // Check authentication state
    console.log('👤 Checking authentication...');
    const authStore = window.__STORES__?.auth || {};
    console.log('- pubkey:', authStore.pubkey?.slice(0, 8));
    console.log('- isAuthenticated:', !!authStore.pubkey);

    // Check NDK state
    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();
    const ndk = client.getNDK();

    console.log('🔗 NDK Connection state:');
    console.log('- connected:', client.isConnected());
    console.log('- signer attached:', !!ndk.signer);
    console.log('- pool size:', ndk.pool?.relays?.size || 0);

    // Check relay states
    console.log('📡 Relay states:');
    if (ndk.pool?.relays) {
      for (const [url, relay] of ndk.pool.relays) {
        console.log(`- ${url}:`, {
          status: relay.status,
          connectivity: relay.connectivity?.status,
          authenticated: relay.authenticated
        });
      }
    }

    // Test a simple workspace fetch
    console.log('📋 Testing workspace fetch...');

    const workspaceEvents = await client.fetchEvents({
      kinds: [39000], // Group metadata
      limit: 10
    });

    console.log('📊 Fetch results:');
    console.log('- workspaces found:', workspaceEvents?.length || 0);

    if (workspaceEvents && workspaceEvents.length > 0) {
      console.log('📋 Found workspaces:');
      for (const event of workspaceEvents) {
        const groupId = event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1];
        const metadata = JSON.parse(event.content || '{}');
        console.log(`- ${groupId}: ${metadata.name} (private: ${metadata.private})`);
      }
    } else {
      console.log('❌ No workspaces found - this suggests an authentication or fetching issue');
    }

    // Test private workspace access
    console.log('🔐 Testing private workspace access...');

    const privateEvents = await client.fetchEvents({
      kinds: [39000],
      "#h": ["dlpnklmeoft"], // Known private workspace
      limit: 1
    });

    console.log('🔐 Private workspace test:');
    console.log('- dlpnklmeoft found:', privateEvents?.length || 0);

    if (privateEvents?.length > 0) {
      console.log('✅ Can access private workspace - authentication working');
    } else {
      console.log('❌ Cannot access private workspace - authentication issue');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Also check local database
async function checkLocalDatabase() {
  console.log('💾 Checking local database...');

  try {
    const { db } = await import('./lib/db/schema.ts');

    const workspaces = await db.nip29Workspaces.toArray();
    const channels = await db.channels.toArray();
    const messages = await db.messages.count();

    console.log('💾 Local database state:');
    console.log('- workspaces:', workspaces.length);
    console.log('- channels:', channels.length);
    console.log('- messages:', messages);

    if (workspaces.length > 0) {
      console.log('📋 Local workspaces:');
      for (const workspace of workspaces) {
        console.log(`- ${workspace.id}: ${workspace.name}`);
      }
    }

    if (channels.length > 0) {
      console.log('📂 Local channels (first 10):');
      for (const channel of channels.slice(0, 10)) {
        console.log(`- ${channel.id}: ${channel.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Local DB check failed:', error);
  }
}

console.log('Starting workspace fetch debugging...');
debugWorkspaceFetching().then(() => {
  console.log('\nChecking local database...');
  return checkLocalDatabase();
}).then(() => {
  console.log('\n🏁 Debug completed');
}).catch(console.error);