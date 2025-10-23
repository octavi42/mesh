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
 * Send a direct invite to a specific user (local system)
 * Since relay blocks most event kinds, we'll use a local invite system
 */
export async function sendDirectInvite(
  groupId: string,
  userPubkey: string,
  options: InviteOptions = {}
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
 * Join a workspace using an invite code
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
