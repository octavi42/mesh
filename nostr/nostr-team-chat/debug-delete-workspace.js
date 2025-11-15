// Debug script to test workspace deletion
// Run this in the browser console to debug deletion issues
//
// Usage:
// 1. Open browser dev tools
// 2. Paste this script
// 3. Call: debugWorkspaceDeletion('your-workspace-id')

async function debugWorkspaceDeletion(workspaceId) {
  console.log('🔍 Starting workspace deletion debug for:', workspaceId);

  try {
    // Check if workspace exists locally
    const { db } = await import('./lib/db/schema.ts');
    const workspace = await db.nip29Workspaces.get(workspaceId);

    if (!workspace) {
      console.error('❌ Workspace not found locally:', workspaceId);
      return;
    }

    console.log('📋 Workspace info:', {
      id: workspace.groupId,
      name: workspace.name,
      admins: workspace.admins.map(a => a.slice(0, 8)),
      members: workspace.members.map(m => m.slice(0, 8)),
    });

    // Check user permissions
    const { useAuthStore } = await import('./lib/stores/auth-store.ts');
    const { pubkey } = useAuthStore.getState();

    if (!pubkey) {
      console.error('❌ No authenticated user');
      return;
    }

    const isAdmin = workspace.admins.includes(pubkey);
    console.log('🔐 User permissions:', {
      userPubkey: pubkey.slice(0, 8),
      isAdmin,
      canDelete: isAdmin
    });

    if (!isAdmin) {
      console.error('❌ User is not an admin - cannot delete workspace');
      return;
    }

    // Extract local group ID
    const parts = workspaceId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : workspaceId;

    console.log('🔍 Group ID analysis:', {
      fullId: workspaceId,
      localId: localGroupId,
      parts: parts
    });

    // Test creating deletion event
    const { deleteGroupEvent } = await import('./lib/nostr/nip29/events.ts');
    const deleteEvent = await deleteGroupEvent(localGroupId);

    console.log('📝 Created deletion event:', {
      kind: deleteEvent.kind,
      tags: deleteEvent.tags,
      id: deleteEvent.id,
      pubkey: deleteEvent.pubkey.slice(0, 8),
      content: deleteEvent.content
    });

    // Test sending to relay
    const { getGlobalNIP29Client } = await import('./lib/nostr/nip29/client.ts');
    const client = getGlobalNIP29Client();

    console.log('📡 Attempting to send deletion event...');

    const result = await client.publishEvent(deleteEvent);
    console.log('📡 Send result:', result);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Verifying deletion on relay...');
    const verificationFilter = {
      kinds: [39000], // Group metadata
      '#h': [localGroupId],
      limit: 1
    };

    const remainingEvents = await client.fetchEvents([verificationFilter]);
    console.log('🔍 Remaining events after deletion:', remainingEvents?.length || 0);

    if (remainingEvents && remainingEvents.length > 0) {
      console.warn('⚠️ Workspace still exists on relay - deletion may have failed');
      console.warn('Remaining events:', remainingEvents);
    } else {
      console.log('✅ Workspace successfully deleted from relay');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Make function available globally
window.debugWorkspaceDeletion = debugWorkspaceDeletion;

console.log('🔧 Debug script loaded. Use: debugWorkspaceDeletion("your-workspace-id")');