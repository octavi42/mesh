import { getEventHash } from 'nostr-tools/pure';
import type { UnsignedNostrEvent, NostrEvent, NIP29GroupMetadata } from './types';
import { NIP29EventKind } from './types';
import { formatGroupMetadata } from './utils';

function ensureNostrAvailable(): void {
  if (!window.nostr) {
    throw new Error('Nostr extension not available');
  }
}

async function signEvent(unsignedEvent: UnsignedNostrEvent): Promise<NostrEvent> {
  ensureNostrAvailable();

  const signedEvent = await window.nostr!.signEvent(unsignedEvent);
  const computedId = getEventHash(signedEvent as UnsignedNostrEvent);

  if (computedId !== signedEvent.id) {
    throw new Error('Event ID mismatch');
  }

  return signedEvent as NostrEvent;
}

export async function createGroupEvent(
  name: string,
  groupId: string,
  about?: string,
  picture?: string,
  isOpen: boolean = false
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const metadata: NIP29GroupMetadata = {
    name,
  };

  if (about) metadata.about = about;
  if (picture) metadata.picture = picture;
  if (isOpen) metadata.open = true;

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.CreateGroup,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['h', groupId]],
    content: formatGroupMetadata(metadata),
  };

  return signEvent(unsignedEvent);
}

export async function addUserEvent(
  groupId: string,
  userPubkey: string,
  roles?: string[]
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  // Use the full group ID for the h tag (relay expects the full group identifier)
  const tags: string[][] = [
    ['h', groupId],
    ['p', userPubkey],
  ];

  if (roles && roles.length > 0) {
    roles.forEach((role) => tags.push(['role', role]));
  }

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.AddUser,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function removeUserEvent(
  groupId: string,
  userPubkey: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.RemoveUser,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', groupId],
      ['p', userPubkey],
    ],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function editMetadataEvent(
  groupId: string,
  metadata: NIP29GroupMetadata
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.EditMetadata,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['h', groupId]],
    content: formatGroupMetadata(metadata),
  };

  return signEvent(unsignedEvent);
}

export async function addPermissionEvent(
  groupId: string,
  userPubkey: string,
  permission: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.AddPermission,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', groupId],
      ['p', userPubkey],
      ['permission', permission],
    ],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function removePermissionEvent(
  groupId: string,
  userPubkey: string,
  permission: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.RemovePermission,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', groupId],
      ['p', userPubkey],
      ['permission', permission],
    ],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function deleteEventEvent(
  groupId: string,
  eventId: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.DeleteEvent,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', groupId],
      ['e', eventId],
    ],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function deleteGroupEvent(groupId: string): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.DeleteGroup,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['h', groupId]],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function createInviteEvent(
  groupId: string,
  expiresAt?: number
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  // Use the full group ID for the h tag
  const tags: string[][] = [['h', groupId]];

  if (expiresAt) {
    tags.push(['expiration', expiresAt.toString()]);
  }

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.CreateInvite,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function joinRequestEvent(
  groupId: string,
  inviteCode?: string,
  message?: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  // Use the full group ID for the h tag
  const tags: string[][] = [['h', groupId]];

  if (inviteCode) {
    tags.push(['code', inviteCode]);
  }

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.JoinRequest,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: message || '',
  };

  return signEvent(unsignedEvent);
}

export async function leaveRequestEvent(groupId: string): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.LeaveRequest,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['h', groupId]],
    content: '',
  };

  return signEvent(unsignedEvent);
}

export async function sendMessageEvent(
  groupId: string,
  content: string,
  channelName?: string,
  replyToEventId?: string
): Promise<NostrEvent> {
  ensureNostrAvailable();
  const pubkey = await window.nostr!.getPublicKey();

  // Extract local group ID for the h tag (NIP-29 events use only the local part)
  const parts = groupId.split("'");
  const localGroupId = parts.length === 2 ? parts[1] : groupId;

  const tags: string[][] = [['h', localGroupId]];

  if (channelName) {
    tags.push(['c', channelName]);
  }

  if (replyToEventId) {
    tags.push(['e', replyToEventId, '', 'reply']);
  }

  const unsignedEvent: UnsignedNostrEvent = {
    kind: NIP29EventKind.GroupChatMessage,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };

  return signEvent(unsignedEvent);
}
