// Test the workspace fetching fix
// Run this in browser console after the changes are deployed

async function testWorkspaceFetch() {
  console.log('🔧 Testing workspace fetch fix...');

  try {
    // Import the fixed workspace hook utilities
    const { forceRefreshWorkspaces } = await import('./lib/hooks/use-nip29-workspaces.ts');

    console.log('🔄 Forcing workspace refresh...');
    forceRefreshWorkspaces();

    // Wait a moment for the refresh to trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Workspace refresh triggered');
    console.log('📋 Check the console for workspace fetching logs...');
    console.log('📋 Look for logs starting with "📜" and "🔗"');

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check workspace store
    console.log('📊 Checking workspace store...');
    const workspaceStore = window.__STORES__?.workspace || {};
    console.log('- Workspaces in store:', workspaceStore.workspaces?.length || 0);

    if (workspaceStore.workspaces?.length > 0) {
      console.log('✅ Workspaces loaded successfully!');
      workspaceStore.workspaces.forEach((ws, i) => {
        console.log(`  ${i + 1}. ${ws.name} (${ws.id})`);
      });
    } else {
      console.log('❌ No workspaces loaded - check the console logs above for errors');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Also provide manual relay test
window.testRelayConnection = async function() {
  console.log('📡 Testing direct relay connection...');

  try {
    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();

    const events = await client.fetchEvents({
      kinds: [39000],
      limit: 5
    });

    console.log('📊 Direct fetch result:', events?.length || 0, 'events');

    if (events && events.length > 0) {
      console.log('✅ Direct relay fetch working');
      for (const event of events) {
        const groupId = event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1];
        const metadata = JSON.parse(event.content || '{}');
        console.log(`- ${groupId}: ${metadata.name}`);
      }
    } else {
      console.log('❌ Direct relay fetch failed');
    }

  } catch (error) {
    console.error('❌ Relay test failed:', error);
  }
};

console.log('🚀 Starting workspace fetch test...');
console.log('💡 You can also manually test with: testRelayConnection()');
testWorkspaceFetch();