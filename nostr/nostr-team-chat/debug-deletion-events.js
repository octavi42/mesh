// Debug script to test if deletion events reach the relay
// Run this in browser console while logged in

async function debugDeletionEvents() {
  console.log('🔍 Testing deletion event sending to relay...');

  try {
    // Get NIP-29 client and functions
    const { getGlobalNIP29Client } = await import('./lib/nostr/nip29/client.ts');
    const { deleteEventEvent } = await import('./lib/nostr/nip29/events.ts');

    const client = getGlobalNIP29Client();

    // Test with a real group ID and message ID
    const testGroupId = 'dlpnklmeoft'; // Use the problem workspace
    const testMessageId = 'fake-message-id-for-testing'; // This won't exist but should still generate event

    console.log('📝 Creating test deletion event...');
    console.log('Group ID:', testGroupId);
    console.log('Message ID:', testMessageId);

    // Create deletion event
    const deleteEvent = await deleteEventEvent(testGroupId, testMessageId);

    console.log('📄 Generated deletion event:', {
      kind: deleteEvent.kind,
      content: deleteEvent.content,
      tags: deleteEvent.tags,
      id: deleteEvent.id?.slice(0, 8),
      pubkey: deleteEvent.pubkey?.slice(0, 8)
    });

    // Check if client is ready
    console.log('🔍 Client status:');
    console.log('- publishEvent method exists:', typeof client.publishEvent === 'function');
    console.log('- client type:', client.constructor.name);

    // Test sending to relay
    console.log('📡 Attempting to send deletion event to relay...');

    const startTime = Date.now();
    const result = await client.publishEvent(deleteEvent);
    const endTime = Date.now();

    console.log('✅ Deletion event sent successfully!');
    console.log('- Time taken:', endTime - startTime, 'ms');
    console.log('- Result:', result);

    // Wait a bit and then check if the event appears on the relay
    console.log('⏰ Waiting 3 seconds then checking relay...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Query the relay for the deletion event
    console.log('🔍 Querying relay for our deletion event...');
    const events = await client.fetchEvents({
      kinds: [9005], // DELETE_EVENT kind
      authors: [deleteEvent.pubkey],
      since: Math.floor(startTime / 1000) - 10, // Last 10 seconds
      limit: 5
    });

    console.log('📋 Found', events?.length || 0, 'deletion events from our pubkey');

    if (events && events.length > 0) {
      for (const event of events) {
        console.log('📄 Found deletion event:', {
          id: event.id?.slice(0, 8),
          created: new Date(event.created_at * 1000).toISOString(),
          tags: event.tags,
          content: event.content.slice(0, 50)
        });
      }
    } else {
      console.log('❌ No deletion events found on relay - this suggests the events are not being stored');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 200)
    });
  }
}

// Also test relay authentication
async function testRelayAuth() {
  console.log('🔐 Testing relay authentication...');

  try {
    const { getGlobalNIP29Client } = await import('./lib/nostr/nip29/client.ts');
    const client = getGlobalNIP29Client();

    // Try to fetch some events that require auth (like private group events)
    console.log('📡 Testing authenticated fetch...');

    const events = await client.fetchEvents({
      kinds: [39000], // Group metadata
      "#h": ["dlpnklmeoft"], // Private group
      limit: 1
    });

    console.log('📋 Auth test - found', events?.length || 0, 'private events');

    if (events && events.length > 0) {
      console.log('✅ Authentication working - can access private group data');
    } else {
      console.log('❌ Authentication issue - cannot access private group data');
    }

  } catch (error) {
    console.error('❌ Auth test failed:', error);
  }
}

// Run both tests
console.log('Starting deletion event debugging...');
debugDeletionEvents().then(() => {
  console.log('\nStarting authentication test...');
  return testRelayAuth();
}).then(() => {
  console.log('\n🏁 All tests completed');
}).catch(console.error);