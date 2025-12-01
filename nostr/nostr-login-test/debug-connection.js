// Simple debug script to test direct NDK connection
const { NDK, NDKNip07Signer } = require('@nostr-dev-kit/ndk');

async function debugConnection() {
  console.log('🔍 Starting direct NDK connection test...');

  try {
    // Create signer
    const signer = new NDKNip07Signer();
    console.log('✅ Created NDKNip07Signer');

    // Create NDK instance
    const ndk = new NDK({
      explicitRelayUrls: ['wss://groups.contextio.app'],
      signer: signer,
    });
    console.log('✅ Created NDK instance with signer');

    // Connect
    console.log('🔗 Connecting to relay...');
    await ndk.connect();
    console.log('✅ Connected to relay');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('⏳ Waited 3 seconds for auth');

    // Check relay status
    const allRelays = Array.from(ndk.pool.relays.values());
    console.log('📊 Relay status:', allRelays.map(r => ({
      url: r.url,
      status: r.status,
      statusName: ['disconnected', 'connecting', 'connected', 'reconnecting', 'error', 'authenticated', 'connected_readonly'][r.status],
      authenticated: r.authenticated,
    })));

    // Try to fetch workspace events
    console.log('📡 Fetching workspace events...');
    const filter = {
      kinds: [39000, 39001, 39002, 9007],
    };
    console.log('📡 Filter:', filter);

    try {
      const events = await ndk.fetchEvents(filter);
      console.log(`✅ Found ${events.size} events:`);

      Array.from(events).forEach((event, i) => {
        if (i < 5) {
          console.log(`  Event ${i+1}:`, {
            id: event.id?.slice(0, 8),
            kind: event.kind,
            tags: event.tags,
          });
        }
      });
    } catch (fetchError) {
      console.error('❌ fetchEvents failed:', fetchError);
    }

    // Try to fetch messages
    console.log('\n📡 Fetching messages...');
    const msgFilter = {
      kinds: [9],
      limit: 10,
    };

    try {
      const messages = await ndk.fetchEvents(msgFilter);
      console.log(`✅ Found ${messages.size} messages`);
    } catch (msgError) {
      console.error('❌ Message fetch failed:', msgError);
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

// Run the test
debugConnection().then(() => {
  console.log('\n✅ Debug test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Debug test crashed:', err);
  process.exit(1);
});
