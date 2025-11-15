// Debug script to check why dlpnklmeoft workspace is not showing up
// Run with: node debug-workspace-dlpnklmeoft.js

const WebSocket = require('ws');

async function debugWorkspaceFetch() {
  console.log('🔍 Debug: Checking dlpnklmeoft workspace on relay...');

  const relay = new WebSocket('wss://groups.contextio.app');

  relay.on('open', () => {
    console.log('✅ Connected to relay');

    // First, try to get all group metadata events
    const allGroupsFilter = JSON.stringify([
      "REQ",
      "debug-all-groups",
      {
        "kinds": [39000], // Group metadata
        "limit": 50
      }
    ]);

    console.log('📡 Requesting all group metadata events...');
    relay.send(allGroupsFilter);

    // Then specifically search for dlpnklmeoft
    const specificFilter = JSON.stringify([
      "REQ",
      "debug-dlpnklmeoft",
      {
        "kinds": [39000, 39001, 39002], // Metadata, admins, members
        "#h": ["dlpnklmeoft"],
        "limit": 10
      }
    ]);

    console.log('📡 Requesting dlpnklmeoft specific events...');
    relay.send(specificFilter);

    // Also check for any events in that group ID
    const groupEventsFilter = JSON.stringify([
      "REQ",
      "debug-dlpnklmeoft-events",
      {
        "kinds": [9, 9007], // Messages and creation
        "#h": ["dlpnklmeoft"],
        "limit": 5
      }
    ]);

    console.log('📡 Requesting dlpnklmeoft group events...');
    relay.send(groupEventsFilter);
  });

  relay.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message[0] === 'EVENT') {
        const [, subId, event] = message;

        if (subId === 'debug-all-groups') {
          console.log('📋 Found group metadata:', {
            groupId: event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1],
            name: extractGroupName(event.content),
            private: event.content.includes('private'),
            closed: event.content.includes('closed'),
            eventId: event.id.slice(0, 8)
          });
        }

        if (subId === 'debug-dlpnklmeoft') {
          console.log('🎯 dlpnklmeoft event found:', {
            kind: event.kind,
            groupId: event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1],
            content: event.content.slice(0, 100),
            tags: event.tags,
            eventId: event.id.slice(0, 8),
            created: new Date(event.created_at * 1000).toISOString()
          });
        }

        if (subId === 'debug-dlpnklmeoft-events') {
          console.log('💬 dlpnklmeoft group event:', {
            kind: event.kind,
            content: event.content.slice(0, 50),
            eventId: event.id.slice(0, 8),
            created: new Date(event.created_at * 1000).toISOString()
          });
        }
      } else if (message[0] === 'EOSE') {
        console.log('✅ End of stored events for:', message[1]);

        if (message[1] === 'debug-dlpnklmeoft-events') {
          console.log('\n🏁 Debug completed. Closing connection...');
          relay.close();
        }
      } else if (message[0] === 'NOTICE') {
        console.log('📢 Relay notice:', message[1]);
      } else if (message[0] === 'AUTH') {
        console.log('🔐 Auth challenge received:', message[1]);
        console.log('ℹ️  This indicates the relay requires authentication for some events');
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  relay.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  relay.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

function extractGroupName(content) {
  try {
    const metadata = JSON.parse(content);
    return metadata.name || 'Unknown';
  } catch {
    return 'Invalid JSON';
  }
}

debugWorkspaceFetch().catch(console.error);