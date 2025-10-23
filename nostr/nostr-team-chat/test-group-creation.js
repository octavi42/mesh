// Test script to debug NIP-29 group creation events
const WebSocket = require('ws');

async function testGroupCreation() {
  console.log('🔄 Testing group creation on wss://groups.contextio.app...');

  const ws = new WebSocket('wss://groups.contextio.app');

  ws.on('open', () => {
    console.log('✅ Connected to relay');

    // Subscribe to all group-related events
    const subscribeAll = JSON.stringify([
      'REQ',
      'test-groups',
      {
        kinds: [9007, 9000, 39000, 39001, 39002], // CreateGroup, AddUser, GroupMetadata, GroupAdmins, GroupMembers
        limit: 10
      }
    ]);

    console.log('📡 Subscribing to group events:', subscribeAll);
    ws.send(subscribeAll);

    setTimeout(() => {
      ws.close();
    }, 5000);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received:', JSON.stringify(message, null, 2));

    if (message[0] === 'EVENT') {
      const event = message[2];
      console.log(`🎯 Event kind ${event.kind}:`);
      console.log(`   - ID: ${event.id}`);
      console.log(`   - Author: ${event.pubkey.substring(0, 8)}...`);
      console.log(`   - Tags: ${JSON.stringify(event.tags)}`);
      console.log(`   - Content: ${event.content}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

testGroupCreation();