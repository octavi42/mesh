// Debug current state to understand fetching issues
// Run this in browser console

async function debugCurrentState() {
  console.log('🔍 Debugging current state after cleanup changes...');

  try {
    // Check workspace store
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    console.log(`📊 Current State Summary:`);
    console.log(`- Workspaces in store: ${workspaces.length}`);

    if (workspaces.length > 0) {
      console.log('📋 Workspaces found:');
      workspaces.forEach((ws, i) => {
        console.log(`  ${i + 1}. ${ws.name} (${ws.id})`);
      });

      // Check for dlpnklmeoft specifically
      const dlpnklmeoftWorkspace = workspaces.find(ws =>
        ws.id === 'dlpnklmeoft' || ws.id.includes('dlpnklmeoft')
      );

      if (dlpnklmeoftWorkspace) {
        console.log('✅ dlpnklmeoft found:', dlpnklmeoftWorkspace.name);

        // Check its channels
        const { db } = await import('./lib/db/schema.ts');
        const channels = await db.channels.where('workspaceId').equals(dlpnklmeoftWorkspace.id).toArray();

        console.log(`📋 Channels for dlpnklmeoft: ${channels.length}`);
        channels.forEach(ch => console.log(`  - ${ch.name}`));
      } else {
        console.log('❌ dlpnklmeoft not found in workspace store');
      }
    } else {
      console.log('❌ No workspaces found in store');
    }

    // Check local database
    console.log('\n💾 Local Database State:');
    const { db } = await import('./lib/db/schema.ts');

    const localWorkspaces = await db.nip29Workspaces.toArray();
    const localChannels = await db.channels.toArray();
    const localMessages = await db.messages.toArray();

    console.log(`- DB Workspaces: ${localWorkspaces.length}`);
    console.log(`- DB Channels: ${localChannels.length}`);
    console.log(`- DB Messages: ${localMessages.length}`);

    if (localChannels.length > 0) {
      console.log('\n📋 Channels by workspace:');
      const channelsByWorkspace = {};
      localChannels.forEach(ch => {
        if (!channelsByWorkspace[ch.workspaceId]) {
          channelsByWorkspace[ch.workspaceId] = [];
        }
        channelsByWorkspace[ch.workspaceId].push(ch.name);
      });

      Object.entries(channelsByWorkspace).forEach(([wsId, channels]) => {
        console.log(`  ${wsId}: ${channels.join(', ')}`);
      });
    }

    // Test direct relay fetch for dlpnklmeoft
    console.log('\n🔧 Testing direct relay fetch for dlpnklmeoft...');

    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();

    try {
      const messages = await client.fetchEvents({
        kinds: [9],
        '#h': ['dlpnklmeoft'],
        limit: 100
      });

      console.log(`📨 Direct fetch for dlpnklmeoft: ${messages?.length || 0} messages`);

      if (messages && messages.length > 0) {
        const channelNames = new Set();
        messages.forEach(msg => {
          const channelTag = msg.tags.find(([tag]) => tag === 'c');
          if (channelTag && channelTag[1]) {
            channelNames.add(channelTag[1]);
          }
        });
        console.log(`📋 Channels found on relay: ${Array.from(channelNames).join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Direct fetch failed:', error);
    }

    // Test workspace metadata fetch
    console.log('\n🔧 Testing workspace metadata fetch...');
    try {
      const workspaceEvents = await client.fetchEvents({
        kinds: [39000],
        limit: 10
      });
      console.log(`📊 Workspace metadata events: ${workspaceEvents?.size || 0}`);
    } catch (error) {
      console.error('❌ Workspace metadata fetch failed:', error);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

console.log('🚀 Running current state debug...');
debugCurrentState();