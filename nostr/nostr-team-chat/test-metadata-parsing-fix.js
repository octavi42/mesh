// Test the metadata parsing fix
// Run this after deploying the fixes

async function testMetadataParsing() {
  console.log('🧪 Testing metadata parsing fix...');

  try {
    // Test the parseGroupMetadata utility directly
    console.log('🔧 Testing parseGroupMetadata utility...');
    const { parseGroupMetadata } = await import('./lib/nostr/nip29/utils.ts');

    // Test with sample metadata
    const testMetadata = '{"name":"Test Group","about":"A test group","private":true}';
    const parsed = parseGroupMetadata(testMetadata);
    console.log('✅ Utility test result:', parsed);

    if (parsed.name === 'Test Group') {
      console.log('✅ parseGroupMetadata utility working correctly');
    } else {
      console.log('❌ parseGroupMetadata utility not working');
    }

    // Test actual workspace fetching
    console.log('\n🔄 Testing workspace refresh...');

    // Force refresh workspaces to test the new parsing
    const { forceRefreshWorkspaces } = await import('./lib/hooks/use-nip29-workspaces.ts');
    forceRefreshWorkspaces();

    // Wait for refresh to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check workspace store
    console.log('📊 Checking workspace results...');
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    console.log(`📋 Found ${workspaces.length} workspaces:`);

    let namedWorkspaces = 0;
    let unnamedWorkspaces = 0;

    workspaces.forEach((workspace, i) => {
      const isUnnamed = workspace.name === 'Unnamed Group';
      console.log(`  ${i + 1}. ${workspace.name} (${workspace.id}) ${isUnnamed ? '❌' : '✅'}`);

      if (isUnnamed) {
        unnamedWorkspaces++;
      } else {
        namedWorkspaces++;
      }

      // Check for dlpnklmeoft specifically
      if (workspace.id === 'dlpnklmeoft' || workspace.id.includes('dlpnklmeoft')) {
        console.log(`    🎯 dlpnklmeoft found: ${workspace.name}`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`  - Named workspaces: ${namedWorkspaces}`);
    console.log(`  - Unnamed workspaces: ${unnamedWorkspaces}`);

    if (unnamedWorkspaces === 0) {
      console.log('✅ All workspaces have names - fix successful!');
    } else if (namedWorkspaces > unnamedWorkspaces) {
      console.log('🟡 Most workspaces have names - partial fix');
    } else {
      console.log('❌ Still many unnamed workspaces - fix may not be working');
    }

    // Check if dlpnklmeoft specifically was found
    const dlpnklmeoftFound = workspaces.some(ws =>
      ws.id === 'dlpnklmeoft' || ws.id.includes('dlpnklmeoft')
    );

    if (dlpnklmeoftFound) {
      console.log('✅ dlpnklmeoft workspace found!');
    } else {
      console.log('❌ dlpnklmeoft workspace still not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

console.log('🚀 Starting metadata parsing test...');
testMetadataParsing();