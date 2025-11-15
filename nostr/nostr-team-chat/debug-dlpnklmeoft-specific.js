// Specific debugging for dlpnklmeoft workspace not being fetched
// Run this in browser console

async function debugDlpnklmeoft() {
  console.log('🔍 Debugging dlpnklmeoft workspace specifically...');

  try {
    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();
    const ndk = client.getNDK();

    // Check authentication status
    console.log('🔐 Authentication check:');
    console.log('- Signer attached:', !!ndk.signer);
    console.log('- Connected:', client.isConnected());

    // Get current user pubkey
    let userPubkey = null;
    if (ndk.signer) {
      try {
        userPubkey = await ndk.signer.user()?.npub || await ndk.signer.user()?.pubkey;
        console.log('- User pubkey:', userPubkey?.slice(0, 16) + '...');
      } catch (e) {
        console.log('- Could not get user pubkey:', e.message);
      }
    }

    // Test 1: Try to fetch all group metadata (should include dlpnklmeoft)
    console.log('\n📋 Test 1: Fetching ALL group metadata...');

    const allGroups = await client.fetchEvents({
      kinds: [39000],
      limit: 100
    });

    console.log(`Found ${allGroups?.length || 0} total groups`);

    let dlpnklmeoftFound = false;
    if (allGroups && allGroups.length > 0) {
      console.log('📋 All groups found:');
      for (const event of allGroups) {
        const groupId = event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1];
        const metadata = JSON.parse(event.content || '{}');
        console.log(`- ${groupId}: ${metadata.name} (private: ${metadata.private || false})`);

        if (groupId === 'dlpnklmeoft') {
          dlpnklmeoftFound = true;
          console.log('  ✅ dlpnklmeoft FOUND in general fetch!');
        }
      }
    }

    if (!dlpnklmeoftFound) {
      console.log('❌ dlpnklmeoft NOT found in general fetch');
    }

    // Test 2: Try to fetch dlpnklmeoft specifically
    console.log('\n🎯 Test 2: Fetching dlpnklmeoft specifically...');

    const specificGroup = await client.fetchEvents({
      kinds: [39000],
      "#h": ["dlpnklmeoft"],
      limit: 1
    });

    if (specificGroup && specificGroup.length > 0) {
      console.log('✅ dlpnklmeoft found with specific fetch');
      const event = specificGroup[0];
      const metadata = JSON.parse(event.content || '{}');
      console.log('- Metadata:', metadata);
      console.log('- Tags:', event.tags);
    } else {
      console.log('❌ dlpnklmeoft NOT found with specific fetch');
    }

    // Test 3: Check membership/admin status for dlpnklmeoft
    console.log('\n👥 Test 3: Checking membership for dlpnklmeoft...');

    const membershipEvents = await client.fetchEvents({
      kinds: [39001, 39002], // Admin and member lists
      "#h": ["dlpnklmeoft"],
      limit: 10
    });

    console.log(`Found ${membershipEvents?.length || 0} membership events for dlpnklmeoft`);

    if (membershipEvents && membershipEvents.length > 0) {
      for (const event of membershipEvents) {
        console.log(`- Kind ${event.kind}:`, event.tags.filter(t => t[0] === 'p').map(t => t[1].slice(0, 8)));

        // Check if current user is in the lists
        if (userPubkey) {
          const members = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
          if (members.includes(userPubkey)) {
            console.log(`  ✅ Current user IS a ${event.kind === 39001 ? 'admin' : 'member'}`);
          }
        }
      }
    }

    // Test 4: Check relay connection specifically
    console.log('\n📡 Test 4: Checking relay connection details...');

    if (ndk.pool?.relays) {
      for (const [url, relay] of ndk.pool.relays) {
        console.log(`- Relay ${url}:`);
        console.log(`  - Status: ${relay.status}`);
        console.log(`  - Connected: ${relay.connectivity?.status}`);
        console.log(`  - Authenticated: ${relay.authenticated || false}`);

        // Try to get connection info
        if (relay.connectivity) {
          console.log(`  - Connection details:`, {
            since: relay.connectivity.since,
            until: relay.connectivity.until,
            readyState: relay.connectivity.readyState
          });
        }
      }
    }

    // Test 5: Try raw WebSocket connection to see auth challenges
    console.log('\n🔌 Test 5: Testing raw connection for auth challenges...');

    const ws = new WebSocket('wss://groups.contextio.app');

    ws.onopen = () => {
      console.log('🔌 Raw WebSocket connected');

      // Request dlpnklmeoft specifically
      const filter = JSON.stringify([
        "REQ",
        "test-dlpnklmeoft",
        {
          kinds: [39000, 39001, 39002],
          "#h": ["dlpnklmeoft"],
          limit: 5
        }
      ]);

      console.log('📤 Sending filter:', filter);
      ws.send(filter);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📥 Raw message:', data[0], data[1] ? data[1].slice(0, 20) : '');

      if (data[0] === 'AUTH') {
        console.log('🔐 AUTH challenge received:', data[1]);
        console.log('  This confirms the workspace requires authentication');
      } else if (data[0] === 'EVENT') {
        console.log('📄 Event received for dlpnklmeoft:', {
          kind: data[2].kind,
          id: data[2].id.slice(0, 8),
          tags: data[2].tags
        });
      } else if (data[0] === 'EOSE') {
        console.log('✅ End of stored events');
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.log('❌ WebSocket error:', error);
    };

    // Clean up after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }, 10000);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

console.log('🚀 Starting dlpnklmeoft specific debugging...');
debugDlpnklmeoft();