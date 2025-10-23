// Test for the specific group we just created
const WebSocket = require('ws');

async function testSpecificGroup() {
  console.log('🔄 Testing for specific group on wss://groups.contextio.app...');

  const ws = new WebSocket('wss://groups.contextio.app');

  ws.on('open', () => {
    console.log('✅ Connected to relay');

    // Test 1: Look for the specific group ID we created
    const groupId = 'groups.contextio.app\'h9dwz2cbdqg';
    console.log('🔍 Looking for group:', groupId);

    const searchForGroup = JSON.stringify([
      'REQ',
      'search-group',
      {
        kinds: [9007], // CreateGroup events
        '#h': [groupId],
        limit: 5
      }
    ]);

    console.log('📡 Searching for specific group:', searchForGroup);
    ws.send(searchForGroup);

    // Test 2: Look for recent CreateGroup events
    setTimeout(() => {
      const recentGroups = JSON.stringify([
        'REQ',
        'recent-groups',
        {
          kinds: [9007],
          since: Math.floor(Date.now() / 1000) - 3600, // Last hour
          limit: 10
        }
      ]);
      console.log('📡 Looking for recent groups:', recentGroups);
      ws.send(recentGroups);
    }, 1000);

    setTimeout(() => {
      ws.close();
    }, 5000);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received:', JSON.stringify(message, null, 2));

    if (message[0] === 'EVENT') {
      const event = message[2];
      console.log(`🎯 Found group event:`);
      console.log(`   - Kind: ${event.kind}`);
      console.log(`   - ID: ${event.id}`);
      console.log(`   - Group ID: ${event.tags.find(([tag]) => tag === 'h')?.[1]}`);
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

testSpecificGroup();