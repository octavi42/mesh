// Debug script to test invite status querying
// Run with: node debug-invite-status.js

const WebSocket = require('ws');

const RELAY_URL = 'wss://groups.contextio.app';

// Replace these with actual values from your test
const GROUP_ID = 'YOUR_GROUP_ID_HERE'; // The local part without the relay prefix
const INVITE_CODE = 'YOUR_INVITE_CODE_HERE';
const USER_PUBKEY = 'YOUR_USER_PUBKEY_HERE';

async function testInviteStatusQuery() {
  console.log('🔍 Testing invite status query...');
  console.log('Relay:', RELAY_URL);
  console.log('Group ID:', GROUP_ID);
  console.log('Invite Code:', INVITE_CODE);
  console.log('User Pubkey:', USER_PUBKEY);
  console.log('---');

  const ws = new WebSocket(RELAY_URL);

  ws.on('open', () => {
    console.log('✅ Connected to relay');

    // Query 1: All events for this user in this group (without code filter)
    const filter1 = {
      kinds: [9021, 9023, 9024, 9025],
      authors: [USER_PUBKEY],
      '#h': [GROUP_ID]
    };

    console.log('\n📤 Sending filter (without #code):', JSON.stringify(filter1, null, 2));
    ws.send(JSON.stringify(['REQ', 'sub1', filter1]));

    // Query 2: All 9025 events in this group (to see all deletes)
    const filter2 = {
      kinds: [9025],
      '#h': [GROUP_ID],
      limit: 50
    };

    console.log('\n📤 Sending filter (all deletes in group):', JSON.stringify(filter2, null, 2));
    ws.send(JSON.stringify(['REQ', 'sub2', filter2]));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    const [type, subId, ...rest] = message;

    if (type === 'EVENT') {
      const event = rest[0];
      console.log(`\n📨 [${subId}] Event received:`, {
        id: event.id.slice(0, 16) + '...',
        kind: event.kind,
        pubkey: event.pubkey.slice(0, 16) + '...',
        created_at: new Date(event.created_at * 1000).toISOString(),
        tags: event.tags,
        content: event.content
      });
    } else if (type === 'EOSE') {
      console.log(`\n✅ [${subId}] End of stored events`);
    } else if (type === 'NOTICE') {
      console.log(`\n⚠️ NOTICE:`, rest);
    } else if (type === 'OK') {
      console.log(`\n📝 OK:`, rest);
    } else {
      console.log(`\n📩 Message:`, message);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('\n🔌 Disconnected from relay');
  });

  // Keep connection open for 5 seconds to receive all events
  setTimeout(() => {
    console.log('\n⏱️ Closing connection after 5 seconds...');
    ws.close();
  }, 5000);
}

testInviteStatusQuery();
