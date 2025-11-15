// Manual cleanup script to remove orphaned channels that don't exist on relay
// Run this in browser console to clean up local storage

async function cleanupOrphanedChannels() {
  console.log('🧹 Starting orphaned channel cleanup...');

  try {
    const { db } = await import('./lib/db/schema.ts');
    const { syncChannelsForWorkspace } = await import('./lib/hooks/use-channels.ts');

    // Get all workspaces
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    if (workspaces.length === 0) {
      console.log('❌ No workspaces found');
      return;
    }

    console.log(`🔍 Checking ${workspaces.length} workspaces for orphaned channels...`);

    let totalChannelsRemoved = 0;

    for (const workspace of workspaces) {
      console.log(`\n🔍 Checking workspace: ${workspace.name} (${workspace.id})`);

      // Get current local channels
      const localChannels = await db.channels.where('workspaceId').equals(workspace.id).toArray();
      console.log(`💾 Local channels: ${localChannels.length}`);

      if (localChannels.length > 0) {
        localChannels.forEach(ch => console.log(`  - ${ch.name}`));
      }

      // Run sync to compare with relay and clean up
      console.log('🔄 Running channel sync with cleanup...');

      const beforeCount = localChannels.length;
      await syncChannelsForWorkspace(workspace.id);

      // Check how many channels remain
      const afterChannels = await db.channels.where('workspaceId').equals(workspace.id).toArray();
      const afterCount = afterChannels.length;

      const removedCount = beforeCount - afterCount;
      if (removedCount > 0) {
        console.log(`✅ Removed ${removedCount} orphaned channels from ${workspace.name}`);
        totalChannelsRemoved += removedCount;
      } else {
        console.log(`✅ No orphaned channels in ${workspace.name}`);
      }

      console.log(`📋 Remaining channels: ${afterCount}`);
      if (afterChannels.length > 0) {
        afterChannels.forEach(ch => console.log(`  - ${ch.name}`));
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`- Workspaces checked: ${workspaces.length}`);
    console.log(`- Total orphaned channels removed: ${totalChannelsRemoved}`);

    if (totalChannelsRemoved > 0) {
      console.log('✅ Cleanup completed! Your local storage now matches the relay state.');
      console.log('💡 Refresh the page to see the updated channel list.');
    } else {
      console.log('✅ No orphaned channels found - your local storage was already in sync!');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Also provide a function to show current state
async function showCurrentChannelState() {
  console.log('📋 Current channel state:');

  try {
    const { db } = await import('./lib/db/schema.ts');
    const workspaceStore = window.__STORES__?.workspace || {};
    const workspaces = workspaceStore.workspaces || [];

    for (const workspace of workspaces) {
      console.log(`\n📁 ${workspace.name} (${workspace.id}):`);

      const channels = await db.channels.where('workspaceId').equals(workspace.id).toArray();

      if (channels.length > 0) {
        channels.forEach((ch, i) => {
          console.log(`  ${i + 1}. ${ch.name} (created: ${new Date(ch.createdAt).toLocaleDateString()})`);
        });
      } else {
        console.log('  (no channels)');
      }
    }

  } catch (error) {
    console.error('❌ Failed to show state:', error);
  }
}

console.log('🧹 Orphaned channel cleanup tool loaded');
console.log('💡 Commands:');
console.log('  - cleanupOrphanedChannels() - Remove channels that dont exist on relay');
console.log('  - showCurrentChannelState() - Show current local channels');

// Auto-run cleanup
console.log('\n🚀 Auto-running cleanup...');
cleanupOrphanedChannels();