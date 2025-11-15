// Debug channel fetching for a specific workspace
// Run this in browser console

async function debugChannelFetching() {
  console.log('🔍 Debugging channel fetching...');

  try {
    // First, get current workspaces
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    if (workspaces.length === 0) {
      console.log('❌ No workspaces found - workspace fetching must be fixed first');
      return;
    }

    console.log(`📋 Found ${workspaces.length} workspaces:`);
    workspaces.forEach((ws, i) => {
      console.log(`  ${i + 1}. ${ws.name} (${ws.id})`);
    });

    // Test channel fetching for each workspace
    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();

    for (const workspace of workspaces) {
      console.log(`\n🔍 Testing channel fetch for: ${workspace.name} (${workspace.id})`);

      // Extract local group ID like the channel sync does
      const parts = workspace.id.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : workspace.id;
      console.log(`- Local group ID: ${localGroupId}`);

      try {
        // Test message fetching
        console.log(`📨 Fetching messages for group: ${localGroupId}`);

        const messages = await client.fetchEvents({
          kinds: [9], // GroupChatMessage
          '#h': [localGroupId],
          limit: 100 // Smaller limit for testing
        });

        console.log(`📨 Found ${messages?.length || 0} messages`);

        if (messages && messages.length > 0) {
          console.log('✅ Message fetch successful');

          // Extract channels like the sync function does
          const channelNames = new Set();
          let channelCount = 0;

          for (const message of messages) {
            const channelTag = message.tags.find(([tag]) => tag === 'c');
            if (channelTag && channelTag[1]) {
              channelNames.add(channelTag[1]);
              channelCount++;
              if (channelCount <= 5) { // Log first 5 for debugging
                console.log(`  📋 Channel: ${channelTag[1]}`);
              }
            }
          }

          console.log(`📋 Unique channels found: ${channelNames.size}`);
          console.log(`📋 Channel names:`, Array.from(channelNames));

          // Check local database for comparison
          const { db } = await import('./lib/db/schema.ts');
          const localChannels = await db.channels.where('workspaceId').equals(workspace.id).toArray();

          console.log(`💾 Local channels in DB: ${localChannels.length}`);
          localChannels.forEach(ch => console.log(`  - ${ch.name}`));

          // Compare
          const missingChannels = Array.from(channelNames).filter(name =>
            !localChannels.some(ch => ch.name === name)
          );

          if (missingChannels.length > 0) {
            console.log(`⚠️ Missing channels from DB: ${missingChannels}`);
          } else if (channelNames.size > 0) {
            console.log('✅ All channels are in local DB');
          }

        } else {
          console.log('❌ No messages found - could be:');
          console.log('  - Authentication issue (private workspace)');
          console.log('  - Wrong group ID format');
          console.log('  - No messages actually exist');
          console.log('  - Relay connection issue');

          // Test if it's an auth issue by trying other event types
          console.log('🔧 Testing other event types for auth...');

          const metadataTest = await client.fetchEvents({
            kinds: [39000], // Metadata
            '#h': [localGroupId],
            limit: 1
          });

          if (metadataTest && metadataTest.length > 0) {
            console.log('✅ Can fetch metadata - auth is working, just no messages');
          } else {
            console.log('❌ Cannot fetch metadata - likely auth issue');
          }
        }

      } catch (fetchError) {
        console.error(`❌ Error fetching for ${workspace.name}:`, fetchError);
      }
    }

    // Also test the actual sync function
    console.log('\n🔧 Testing actual syncChannelsForWorkspace function...');

    const testWorkspace = workspaces[0];
    if (testWorkspace) {
      console.log(`Testing sync for: ${testWorkspace.name}`);

      const { syncChannelsForWorkspace } = await import('./lib/hooks/use-channels.ts');
      await syncChannelsForWorkspace(testWorkspace.id);

      console.log('✅ Sync function completed');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

console.log('🚀 Starting channel fetching debug...');
debugChannelFetching();