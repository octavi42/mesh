// Test basic workspace fetching after reverting changes
// Run this in browser console

async function testBasicWorkspaceFetching() {
  console.log('🔄 Testing basic workspace fetching...');

  try {
    // Clear any existing workspace data
    const { forceRefreshWorkspaces } = await import('./lib/hooks/use-nip29-workspaces.ts');
    console.log('🧹 Clearing workspace cache...');
    forceRefreshWorkspaces();

    // Wait for the fetch to complete
    console.log('⏳ Waiting for workspace fetch to complete...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check results
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    console.log(`📊 Results:`);
    console.log(`- Total workspaces found: ${workspaces.length}`);

    if (workspaces.length > 0) {
      console.log('✅ Workspace fetching is working!');
      console.log('📋 Workspaces:');

      workspaces.forEach((workspace, i) => {
        console.log(`  ${i + 1}. ${workspace.name} (${workspace.id})`);
        console.log(`      - Public: ${workspace.isPublic}`);
        console.log(`      - Members: ${workspace.memberCount}`);
        console.log(`      - Admins: ${workspace.adminCount}`);
      });

      // Check if dlpnklmeoft is found
      const dlpnklmeoftWorkspace = workspaces.find(ws =>
        ws.id === 'dlpnklmeoft' || ws.id.includes('dlpnklmeoft')
      );

      if (dlpnklmeoftWorkspace) {
        console.log('🎯 dlpnklmeoft found:', dlpnklmeoftWorkspace.name);
      } else {
        console.log('❌ dlpnklmeoft not found');
      }

    } else {
      console.log('❌ No workspaces found - fetching is still broken');

      // Test direct relay connection
      console.log('🔧 Testing direct relay connection...');
      const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
      const client = getGlobalNDKClient();

      const directEvents = await client.fetchEvents({
        kinds: [39000],
        limit: 5
      });

      console.log(`📡 Direct fetch result: ${directEvents?.length || 0} events`);

      if (directEvents && directEvents.length > 0) {
        console.log('✅ Direct relay fetch works - issue is in the hook logic');
      } else {
        console.log('❌ Direct relay fetch also failing - authentication or connection issue');
      }
    }

    // Also check local database
    console.log('\n💾 Checking local database...');
    const { db } = await import('./lib/db/schema.ts');

    const localWorkspaces = await db.nip29Workspaces.toArray();
    const localChannels = await db.channels.toArray();

    console.log(`💾 Local storage:`);
    console.log(`- Workspaces: ${localWorkspaces.length}`);
    console.log(`- Channels: ${localChannels.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

console.log('🚀 Starting basic workspace fetching test...');
testBasicWorkspaceFetching();