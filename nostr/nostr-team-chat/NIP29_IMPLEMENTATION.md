# NIP-29 Implementation Guide

## Overview
This document describes the NIP-29 (relay-based groups) implementation for Nostr Team Chat.

## Architecture

### Service Layer (`lib/nostr/nip29/`)
- **types.ts**: TypeScript interfaces for NIP-29 events and data structures
- **utils.ts**: Helper functions for group ID parsing, validation, and metadata handling
- **client.ts**: WebSocket relay connection manager with auto-reconnect
- **events.ts**: Event builders for all NIP-29 event kinds (9000-9022, 39000-39003)
- **subscriptions.ts**: Real-time subscription handlers for group events
- **index.ts**: Barrel export for clean imports

### State Management
- **workspace-store.ts**: Zustand store managing NIP-29 workspaces
  - Connect to relay
  - Create workspaces (kind:9007)
  - Sync workspace metadata
  - Subscribe to real-time updates
  - Cache in IndexedDB

### Database Schema (v2)
- **nip29Workspaces**: Stores NIP-29 group metadata locally
- **nip29Members**: Stores group membership data

### Hooks
- **use-nip29-workspace.ts**: React hook for accessing workspace data
- **use-workspace-members.ts**: React hook for member/admin checks

## Relay Configuration

**Default Relay**: `wss://relay.groups.nip29.com`

To change relay, update initialization:
```typescript
const client = getGlobalNIP29Client('wss://your-relay.com');
```

## Event Kinds Reference

| Kind | Purpose | Who Can Send |
|------|---------|--------------|
| 9 | Chat message | Members |
| 9000 | Add user | Admins |
| 9001 | Remove user | Admins |
| 9002 | Edit metadata | Admins |
| 9003 | Add permission | Admins |
| 9004 | Remove permission | Admins |
| 9005 | Delete event | Admins |
| 9007 | Create group | Anyone |
| 9008 | Delete group | Admins |
| 9009 | Create invite | Admins |
| 9021 | Join request | Anyone |
| 9022 | Leave request | Members |
| 39000 | Group metadata | Relay |
| 39001 | Group admins | Relay |
| 39002 | Group members | Relay |

## Usage Examples

### Creating a Workspace
```typescript
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

const { createWorkspace, initializeClient } = useWorkspaceStore();

// Initialize connection
await initializeClient();

// Create workspace
const groupId = await createWorkspace(
  'My Team',           // name
  'Team workspace',    // description
  undefined,           // picture URL
  false                // isOpen (false = closed group)
);
```

### Subscribing to Workspace Updates
```typescript
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

const { subscribeToWorkspace } = useWorkspaceStore();

// Auto-sync when metadata, admins, or members change
subscribeToWorkspace(groupId);
```

### Checking Permissions
```typescript
import { useWorkspaceMembers } from '@/lib/hooks/use-nip29-workspace';

const { isAdmin, isMember } = useWorkspaceMembers(groupId);

if (isAdmin(myPubkey)) {
  // Show admin actions
}
```

## Group ID Format

Format: `relay-host'local-id`

Example: `relay.groups.nip29.com'abc123def456`

- **relay-host**: Domain of the relay (without wss://)
- **local-id**: Unique identifier (alphanumeric, dash, underscore)

## Features Implemented

### Phase 1: Foundation ✅
- [x] NIP-29 types and interfaces
- [x] Relay client with WebSocket management
- [x] Event builders for all NIP-29 kinds
- [x] Subscription manager
- [x] Database schema v2

### Phase 2: Workspace Creation ✅
- [x] Workspace store with NIP-29 integration
- [x] Create workspace (kind:9007)
- [x] Sync metadata from relay
- [x] Real-time subscriptions
- [x] Updated CreateWorkspaceSheet UI
- [x] React hooks for easy access
- [x] Auto-connect on app start

## Next Steps

### Phase 3: Invite System
- [ ] Invite UI (kind:9009)
- [ ] Join request handler (kind:9021)
- [ ] Invite code generation
- [ ] Invite link sharing

### Phase 4: Admin & Moderation
- [ ] Add/remove admin (kind:9003/9004)
- [ ] Kick user (kind:9001)
- [ ] Delete message (kind:9005)
- [ ] Admin panel UI

### Phase 5: Messaging
- [ ] Send messages (kind:9)
- [ ] Subscribe to group messages
- [ ] Channel support with 'c' tag
- [ ] Message history loading

## Security Considerations

1. **Kicked Users**: Can read old messages they downloaded, but relay blocks new message access
2. **Group Deletion**: Relay may delete messages (policy-dependent), but no cryptographic guarantee
3. **Admin Actions**: Validated by relay, not just client-side
4. **Private Workspaces**: For sensitive data, consider adding NIP-44 encryption on top of NIP-29

## Migration Path

### Current State
- Using mock data from `seedMockData()`
- Local-only workspaces

### Migration Options

**Option 1: Gradual (Recommended)**
```typescript
// Use feature flag
const USE_NIP29 = process.env.NEXT_PUBLIC_USE_NIP29 === 'true';

if (USE_NIP29) {
  await initializeClient();
} else {
  seedMockData();
}
```

**Option 2: Full Switch**
- Remove `seedMockData()` call
- Use only NIP-29 workspaces

### Self-Hosting

To self-host relay:
1. Deploy `groups-relay` (github.com/max21dev/groups-relay)
2. Update relay URL in workspace store
3. Migrate existing groups if needed

## Troubleshooting

### Connection Issues
```typescript
// Check relay status
const client = getGlobalNIP29Client();
console.log('Connected:', client.isConnected());
```

### Event Publishing Failures
- Verify Nostr extension is available
- Check relay accepts your events
- Ensure proper event structure

### Sync Issues
```typescript
// Manual sync
await syncWorkspace(groupId);
```

## Performance Optimization

1. **Subscription Management**: Unsubscribe when leaving workspace
2. **Batch Sync**: Sync multiple workspaces in parallel
3. **Cache Strategy**: Use IndexedDB for offline support
4. **Lazy Loading**: Only subscribe to active workspace

## References

- [NIP-29 Specification](https://github.com/nostr-protocol/nips/blob/master/29.md)
- [relay.groups.nip29.com](https://relay.groups.nip29.com)
- [max21dev/groups](https://github.com/max21dev/groups) - Reference implementation
