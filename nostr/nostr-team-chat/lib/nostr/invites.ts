import { createInviteEvent, joinRequestEvent } from './nip29/events';
import { getGlobalNIP29Client } from './nip29/client';
import { NIP29EventKind } from './nip29/types';
import type { NostrEvent, UnsignedNostrEvent } from './nip29/types';

export interface InviteOptions {
  expiresAt?: number;
  maxUses?: number;
  role?: string;
}

export interface InviteData {
  code: string;
  groupId: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  usedCount: number;
  role: string;
}

export interface InviteEvent extends NostrEvent {
  kind: NIP29EventKind.CreateInvite;
}

/**
 * Create an invite event with all data included before signing
 */
async function createInviteEventWithData(
  groupId: string,
  inviteData: InviteData,
  options: InviteOptions
): Promise<NostrEvent> {
  // Ensure Nostr is available
  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  
  // Update invite data with pubkey
  inviteData.createdBy = pubkey;

  // Extract local group ID for the h tag (relay expects only the local part)
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;
  const tags: string[][] = [['h', localGroupId], ['code', inviteData.code]];

  console.log('🔧 Creating invite event:', { groupId, localGroupId, tags });

  if (options.expiresAt) {
    tags.push(['expiration', options.expiresAt.toString()]);
  }

  if (options.maxUses) {
    tags.push(['max_uses', options.maxUses.toString()]);
  }

  if (options.role) {
    tags.push(['role', options.role]);
  }

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.CreateInvite,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: JSON.stringify(inviteData),
  };

  // Sign the event
  const signedEvent = await window.nostr.signEvent(unsignedEvent);
  
  return signedEvent as NostrEvent;
}

/**
 * Create a custom invite event using kind 1 (notes) with special tags
 * This works with relays that don't support NIP-29 kind 9009
 */
async function createCustomInviteEvent(
  groupId: string,
  userPubkey: string,
  inviteData: InviteData,
  options: InviteOptions
): Promise<NostrEvent> {
  // Ensure Nostr is available
  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  
  // Update invite data with pubkey
  inviteData.createdBy = pubkey;

  // Extract local group ID for the h tag
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;
  
  const tags: string[][] = [
    ['h', localGroupId],
    ['code', inviteData.code],
    ['p', userPubkey], // Direct invite to specific user
    ['invite', 'true'], // Mark as invite
    ['group', groupId] // Store full group ID for reference
  ];

  if (options.expiresAt) {
    tags.push(['expiration', options.expiresAt.toString()]);
  }

  if (options.maxUses) {
    tags.push(['max_uses', options.maxUses.toString()]);
  }

  if (options.role) {
    tags.push(['role', options.role]);
  }

  console.log('🔧 Creating custom invite event:', { groupId, localGroupId, userPubkey, tags });

  const unsignedEvent: UnsignedNostrEvent = {
    kind: 1, // Use kind 1 (notes) instead of 9009
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: `Invitation to join workspace: ${inviteData.groupId}\n\nInvite code: ${inviteData.code}\n\nThis is an automated invite message.`,
  };

  // Sign the event
  const signedEvent = await window.nostr.signEvent(unsignedEvent);
  
  return signedEvent as NostrEvent;
}

/**
 * Store invite data locally in IndexedDB
 */
async function storeInviteLocally(inviteData: InviteData): Promise<void> {
  try {
    const { db } = await import('@/lib/db/schema');
    
    // Add invite to local database
    await db.invites.add({
      code: inviteData.code,
      groupId: inviteData.groupId,
      createdBy: inviteData.createdBy,
      createdAt: inviteData.createdAt,
      expiresAt: inviteData.expiresAt,
      maxUses: inviteData.maxUses,
      usedCount: inviteData.usedCount,
      role: inviteData.role,
      isActive: true
    });
    
    console.log('💾 Stored invite locally:', inviteData.code);
  } catch (error) {
    console.error('Failed to store invite locally:', error);
    throw error;
  }
}

/**
 * Fetch invite data from local storage by invite code
 */
async function getInviteFromLocal(inviteCode: string): Promise<InviteData | null> {
  try {
    const { db } = await import('@/lib/db/schema');
    
    const invite = await db.invites.where('code').equals(inviteCode).first();
    
    if (!invite) {
      return null;
    }
    
    return {
      code: invite.code,
      groupId: invite.groupId,
      createdBy: invite.createdBy,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      role: invite.role
    };
  } catch (error) {
    console.error('Failed to fetch invite from local storage:', error);
    return null;
  }
}
export function generateInviteCode(): string {
  // Generate a 12-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate a Nostr public key or npub
 */
export function validatePublicKey(input: string): string | null {
  // Remove whitespace
  const cleaned = input.trim();
  
  // Check if it's an npub (starts with npub1)
  if (cleaned.startsWith('npub1')) {
    try {
      // For now, we'll accept any npub1 format
      // In a real implementation, you'd decode the bech32
      return cleaned;
    } catch {
      return null;
    }
  }
  
  // Check if it's a hex public key (64 characters)
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Create an invite for a workspace
 */
export async function createWorkspaceInvite(
  groupId: string,
  options: InviteOptions = {}
): Promise<{ inviteCode: string; inviteEvent: InviteEvent }> {
  const client = getGlobalNIP29Client();
  
  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }
  
  // Generate unique invite code
  const inviteCode = generateInviteCode();
  
  // Create invite data
  const inviteData: InviteData = {
    code: inviteCode,
    groupId,
    createdBy: '', // Will be set after getting pubkey
    createdAt: Date.now(),
    expiresAt: options.expiresAt,
    maxUses: options.maxUses,
    usedCount: 0,
    role: options.role || 'member'
  };
  
  // Create the invite event with all data included
  const inviteEvent = await createInviteEventWithData(groupId, inviteData, options);
  
  // Publish to relay
  await client.publishEvent(inviteEvent);
  
  console.log('📧 Created invite:', { inviteCode, groupId, options });
  
  return { inviteCode, inviteEvent: inviteEvent as InviteEvent };
}

/**
 * Check if a group exists on the relay
 */
async function checkGroupExists(
  groupId: string
): Promise<boolean> {
  const client = getGlobalNIP29Client();

  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }

  // Extract local group ID for the h tag
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  try {
    console.log('🔍 Checking if group exists on relay:', { groupId, localGroupId });

    // First, let's try to get all groups to see what's available
    console.log('🔍 Fetching all group creation events...');
    const allGroupEvents = await client.fetchEvents([
      {
        kinds: [NIP29EventKind.CreateGroup],
        limit: 10
      }
    ]);

    console.log('📋 Found groups on relay:', allGroupEvents.map(e => ({
      id: e.id,
      tags: e.tags,
      content: e.content.substring(0, 100)
    })));

    // Check if group exists by trying to fetch group metadata
    const events = await client.fetchEvents([
      {
        kinds: [NIP29EventKind.CreateGroup],
        '#h': [localGroupId],
        limit: 1
      }
    ]);

    if (events.length > 0) {
      console.log('✅ Group exists on relay:', localGroupId, events[0]);
      return true;
    }

    console.log('❌ Group does not exist on relay:', localGroupId);
    return false;

  } catch (error) {
    console.error('❌ Failed to check if group exists:', error);
    // If we can't verify due to auth issues, assume it might exist
    if (error instanceof Error && error.message.includes('Authentication required')) {
      console.warn('⚠️ Authentication issue during group check - assuming group might exist');
      return true;
    }
    return false;
  }
}

/**
 * Send a relay-based invite using proper NIP-29 flow (PRODUCTION)
 * Creates an invite code that can be used with kind 9021 join requests
 */
export async function sendRelayInvite(
  groupId: string,
  userPubkey: string,
  options: InviteOptions & { workspaceName?: string; inviterName?: string } = {}
): Promise<{ inviteCode: string; inviteLink: string; eventId: string }> {
  const client = getGlobalNIP29Client();

  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }

  // Check if the group exists on the relay (non-blocking for invites)
  try {
    const groupExists = await checkGroupExists(groupId);
    if (!groupExists) {
      console.warn(`⚠️ Group ${groupId} may not exist on relay, but proceeding with invite`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not verify group existence (${error}), but proceeding with invite`);
  }

  // Get current user's pubkey
  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  const inviteCode = generateInviteCode();

  // Extract local group ID
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  // Create the invite on the relay using NIP-29 KIND_GROUP_CREATE_INVITE_9009
  console.log('📤 Creating invite on relay...', {
    localGroupId,
    fullGroupId: groupId,
    inviteCode,
    expiresAt: options.expiresAt,
    userPubkey
  });

  const inviteEvent = await createInviteEvent(localGroupId, options.expiresAt, inviteCode);

  console.log('🔍 Created invite event:', {
    id: inviteEvent.id,
    kind: inviteEvent.kind,
    tags: inviteEvent.tags,
    content: inviteEvent.content,
    pubkey: inviteEvent.pubkey,
    created_at: inviteEvent.created_at
  });

  // Publish the invite creation event to the relay
  await client.publishEvent(inviteEvent);
  console.log('✅ Invite creation event published to relay:', { inviteCode, eventId: inviteEvent.id });

  // Create invite link
  const inviteLink = `${window.location.origin}/invite/${inviteCode}`;

  console.log('📡 Created NIP-29 compatible invite:', {
    inviteCode,
    inviteLink,
    localGroupId,
    fullGroupId: groupId,
    userPubkey,
    eventId: inviteEvent.id
  });

  // Send relay-based invite notification using kind 1 events
  try {
    console.log('📤 Sending relay invite notification to user:', userPubkey);

    const inviteNotificationEvent = {
      kind: 1, // Text note
      content: JSON.stringify({
        type: 'invite',
        title: 'Workspace Invitation',
        groupName: options.workspaceName || 'Unknown Workspace', // Add this field that handler expects
        workspaceName: options.workspaceName || 'Unknown Workspace', // Keep this for compatibility
        inviterName: options.inviterName || 'Someone', // Add this field that handler expects
        message: `${options.inviterName || 'Someone'} invited you to join ${options.workspaceName || 'a workspace'}`,
        inviteCode,
        groupId: localGroupId,
        fullGroupId: groupId,
        inviterPubkey: pubkey,
        role: options.role || 'member',
        inviteLink: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/invite/${inviteCode}`
      }),
      tags: [
        ['p', userPubkey], // Tag the invited user
        ['t', 'invite'], // Tag as invite
        ['t', 'notification'], // Tag as notification
        ['invite_code', inviteCode], // Include invite code
        ['group_id', localGroupId] // Include group ID
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: pubkey
    };

    // Sign and publish the invite notification
    const signedNotification = await window.nostr.signEvent(inviteNotificationEvent);
    await client.publishEvent(signedNotification);

    console.log('📤 Published invite notification to relay:', {
      eventId: signedNotification.id,
      targetUser: userPubkey,
      inviteCode
    });
  } catch (error) {
    console.warn('⚠️ Failed to send relay notification:', error);
    // No fallback - all notifications should come from relay events only
  }

  return {
    inviteCode,
    inviteLink,
    eventId: `invite_${inviteCode}` // Fake event ID since we're not publishing
  };
}

/**
 * Send a direct invite to a specific user (local system - DEPRECATED)
 * Use sendRelayInvite for production
 */
export async function sendDirectInvite(
  groupId: string,
  userPubkey: string,
  options: InviteOptions & { workspaceName?: string; inviterName?: string } = {}
): Promise<{ inviteCode: string; inviteLink: string }> {
  // Generate unique invite code
  const inviteCode = generateInviteCode();

  // Get current user's pubkey
  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();

  // Create invite data
  const inviteData: InviteData = {
    code: inviteCode,
    groupId,
    createdBy: pubkey,
    createdAt: Date.now(),
    expiresAt: options.expiresAt,
    maxUses: options.maxUses,
    usedCount: 0,
    role: options.role || 'member'
  };

  // Store invite locally in IndexedDB
  await storeInviteLocally(inviteData);

  // Note: This function is deprecated and no longer creates local notifications
  // All notifications should come from relay events via sendRelayInvite

  // Create invite link
  const inviteLink = `${window.location.origin}/invite/${inviteCode}`;

  console.log('📧 Created local invite:', {
    inviteCode,
    groupId,
    userPubkey,
    inviteLink,
    options
  });

  return { inviteCode, inviteLink };
}

/**
 * Fetch invite data by invite code (local system)
 */
export async function getInviteByCode(inviteCode: string): Promise<InviteData | null> {
  // Try local storage first
  const localInvite = await getInviteFromLocal(inviteCode);
  if (localInvite) {
    console.log('📧 Found invite in local storage:', inviteCode);
    return localInvite;
  }
  
  // If not found locally, try relay (for backwards compatibility)
  try {
    const client = getGlobalNIP29Client();
    
    // Ensure client is connected
    if (!client.isConnected()) {
      await client.connect();
    }
    
    // Search for custom invite events (kind 1) with invite tag
    const events = await client.fetchEvents([
      {
        kinds: [1], // Use kind 1 instead of 9009
        '#code': [inviteCode],
        '#invite': ['true']
      }
    ]);
    
    if (events.length === 0) {
      return null;
    }
    
    const event = events[0];
    
    // Extract invite data from tags since we're using kind 1
    const groupTag = event.tags.find(tag => tag[0] === 'group');
    const codeTag = event.tags.find(tag => tag[0] === 'code');
    const expirationTag = event.tags.find(tag => tag[0] === 'expiration');
    const maxUsesTag = event.tags.find(tag => tag[0] === 'max_uses');
    const roleTag = event.tags.find(tag => tag[0] === 'role');
    
    if (!groupTag || !codeTag) {
      return null;
    }
    
    const inviteData: InviteData = {
      code: codeTag[1],
      groupId: groupTag[1],
      createdBy: event.pubkey,
      createdAt: event.created_at * 1000,
      expiresAt: expirationTag ? parseInt(expirationTag[1]) : undefined,
      maxUses: maxUsesTag ? parseInt(maxUsesTag[1]) : undefined,
      usedCount: 0, // We'll need to track this separately
      role: roleTag ? roleTag[1] : 'member'
    };
    
    // Validate the invite
    if (inviteData.expiresAt && Date.now() > inviteData.expiresAt) {
      console.log('⏰ Invite expired:', inviteCode);
      return null;
    }
    
    if (inviteData.maxUses && inviteData.usedCount >= inviteData.maxUses) {
      console.log('🚫 Invite usage limit reached:', inviteCode);
      return null;
    }
    
    return inviteData;
  } catch (error) {
    console.error('Failed to fetch invite from relay:', error);
    return null;
  }
}

/**
 * Accept an invite via relay (PRODUCTION)
 */
export async function acceptRelayInvite(
  groupId: string,
  inviteCode: string,
  message?: string
): Promise<{ eventId: string }> {
  const client = getGlobalNIP29Client();

  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }

  // Extract local group ID for the h tag (relay expects only the local part)
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  console.log('🔍 Join request details:', {
    originalGroupId: groupId,
    localGroupId,
    inviteCode,
    message
  });

  // Create join request event
  const joinEvent = await joinRequestEvent(localGroupId, inviteCode, message);

  console.log('🔍 Created join request event:', {
    id: joinEvent.id,
    kind: joinEvent.kind,
    tags: joinEvent.tags,
    content: joinEvent.content,
    pubkey: joinEvent.pubkey,
    created_at: joinEvent.created_at
  });

  // Publish to relay
  await client.publishEvent(joinEvent);
  console.log('✅ Join request event published to relay');

  console.log('🤝 Sent relay join request:', { groupId, localGroupId, inviteCode, message, eventId: joinEvent.id });

  return { eventId: joinEvent.id };
}

/**
 * Join a workspace using an invite code (DEPRECATED - use acceptRelayInvite for production)
 */
export async function joinWorkspaceWithInvite(
  groupId: string,
  inviteCode: string,
  message?: string
): Promise<void> {
  const client = getGlobalNIP29Client();

  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }

  // Create join request event
  const joinEvent = await joinRequestEvent(groupId, inviteCode, message);

  // Publish to relay
  await client.publishEvent(joinEvent);

  console.log('🤝 Sent join request:', { groupId, inviteCode, message });
}

/**
 * Check if current user is admin of a workspace
 */
export async function isWorkspaceAdmin(groupId: string, userPubkey: string): Promise<boolean> {
  const client = getGlobalNIP29Client();

  // Ensure client is connected
  if (!client.isConnected()) {
    await client.connect();
  }

  try {
    // Extract local group ID for the h tag (relay expects only the local part)
    const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

    const events = await client.fetchEvents([
      {
        kinds: [NIP29EventKind.GroupAdmins],
        '#h': [localGroupId]
      }
    ]);

    if (events.length === 0) {
      return false;
    }

    const adminEvent = events[0];
    const adminPubkeys = adminEvent.tags
      .filter(tag => tag[0] === 'p')
      .map(tag => tag[1]);

    return adminPubkeys.includes(userPubkey);
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
}

/**
 * Send an invite decline event to the relay
 */
export async function declineInvite(
  groupId: string,
  inviteCode: string
): Promise<{ eventId: string }> {
  const client = getGlobalNIP29Client();

  if (!client.isConnected()) {
    await client.connect();
  }

  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  const unsignedEvent = {
    kind: 9023, // KIND_GROUP_INVITE_DECLINE_9023
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', localGroupId],
      ['code', inviteCode]
    ],
    content: 'Declined invitation'
  };

  const signedEvent = await window.nostr.signEvent(unsignedEvent);
  await client.publishEvent(signedEvent);

  console.log('❌ Declined invite:', { groupId, inviteCode, eventId: signedEvent.id });

  return { eventId: signedEvent.id };
}

/**
 * Send an invite seen event to the relay
 */
export async function markInviteSeen(
  groupId: string,
  inviteCode: string
): Promise<{ eventId: string }> {
  const client = getGlobalNIP29Client();

  if (!client.isConnected()) {
    await client.connect();
  }

  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  const unsignedEvent = {
    kind: 9024, // KIND_GROUP_INVITE_SEEN_9024
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', localGroupId],
      ['code', inviteCode]
    ],
    content: 'Viewed invitation'
  };

  const signedEvent = await window.nostr.signEvent(unsignedEvent);
  await client.publishEvent(signedEvent);

  console.log('👁️ Marked invite as seen:', { groupId, inviteCode, eventId: signedEvent.id });

  return { eventId: signedEvent.id };
}

/**
 * Send an invite delete event to the relay
 */
export async function deleteInvite(
  groupId: string,
  inviteCode: string
): Promise<{ eventId: string }> {
  const client = getGlobalNIP29Client();

  if (!client.isConnected()) {
    await client.connect();
  }

  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }

  const pubkey = await window.nostr.getPublicKey();
  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  const unsignedEvent = {
    kind: 9025, // KIND_GROUP_INVITE_DELETE_9025
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', localGroupId],
      ['code', inviteCode]
    ],
    content: 'Deleted invitation'
  };

  const signedEvent = await window.nostr.signEvent(unsignedEvent);
  await client.publishEvent(signedEvent);

  console.log('🗑️ Deleted invite:', { groupId, inviteCode, eventId: signedEvent.id });

  return { eventId: signedEvent.id };
}

/**
 * Get the current status of an invite for a specific user
 */
export async function getInviteStatus(
  groupId: string,
  inviteCode: string,
  userPubkey: string
): Promise<'pending' | 'seen' | 'accepted' | 'declined' | 'deleted'> {
  const client = getGlobalNIP29Client();

  if (!client.isConnected()) {
    await client.connect();
  }

  const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

  try {
    // Check for all invite state events for this user and invite
    const stateEvents = await client.fetchEvents([
      {
        kinds: [9021, 9023, 9024, 9025], // Join request, decline, seen, delete
        authors: [userPubkey],
        '#h': [localGroupId],
        '#code': [inviteCode],
        limit: 50
      }
    ]);

    // Sort by timestamp (most recent first)
    stateEvents.sort((a, b) => b.created_at - a.created_at);

    // Check the most recent state
    if (stateEvents.length === 0) {
      return 'pending';
    }

    const latestEvent = stateEvents[0];
    switch (latestEvent.kind) {
      case 9021: // JOIN_REQUEST - means accepted
        return 'accepted';
      case 9023: // DECLINE
        return 'declined';
      case 9024: // SEEN
        return 'seen';
      case 9025: // DELETE
        return 'deleted';
      default:
        return 'pending';
    }
  } catch (error) {
    console.error('Failed to fetch invite status:', error);
    return 'pending';
  }
}
