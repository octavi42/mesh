import type { NIP29Group } from './types';

export function parseGroupId(groupId: string): { relay: string; id: string } | null {
  const parts = groupId.split("'");
  if (parts.length !== 2) return null;

  return {
    relay: parts[0],
    id: parts[1],
  };
}

export function createGroupId(relayHost: string, localId: string): string {
  const cleanHost = relayHost.replace('wss://', '').replace('ws://', '');
  return `${cleanHost}'${localId}`;
}

export function validateGroupId(groupId: string): boolean {
  const parsed = parseGroupId(groupId);
  if (!parsed) return false;

  return /^[a-z0-9\-_.]+$/.test(parsed.id);
}

export function extractTagValue(tags: string[][], tagName: string): string | undefined {
  const tag = tags.find(([name]) => name === tagName);
  return tag?.[1];
}

export function extractAllTagValues(tags: string[][], tagName: string): string[] {
  return tags
    .filter(([name]) => name === tagName)
    .map(([, value]) => value)
    .filter(Boolean);
}

export function isUserAdmin(group: NIP29Group, pubkey: string): boolean {
  return group.admins.includes(pubkey);
}

export function isUserMember(group: NIP29Group, pubkey: string): boolean {
  return group.members.includes(pubkey) || group.admins.includes(pubkey);
}

export function getRelayUrlFromGroupId(groupId: string): string | null {
  const parsed = parseGroupId(groupId);
  if (!parsed) return null;

  return `wss://${parsed.relay}`;
}

export function generateLocalGroupId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Parse group metadata from event tags (NIP-29 standard)
 * Relay-generated 39000 events store metadata in tags, not JSON content
 */
export function parseGroupMetadataFromTags(tags: string[][]): Record<string, string | boolean | undefined> {
  const metadata: Record<string, string | boolean | undefined> = {};
  
  for (const tag of tags) {
    const [key, value] = tag;
    switch (key) {
      case 'name':
        metadata.name = value;
        break;
      case 'about':
        metadata.about = value;
        break;
      case 'picture':
        metadata.picture = value;
        break;
      case 'private':
        metadata.private = true;
        metadata.public = false;
        break;
      case 'public':
        metadata.private = false;
        metadata.public = true;
        break;
      case 'closed':
        metadata.closed = true;
        metadata.open = false;
        break;
      case 'open':
        metadata.closed = false;
        metadata.open = true;
        break;
      case 'broadcast':
        metadata.broadcast = true;
        break;
      case 'nonbroadcast':
        metadata.broadcast = false;
        break;
    }
  }
  
  return metadata;
}

/**
 * @deprecated Use parseGroupMetadataFromTags instead - relay 39000 events use tags, not JSON content
 * This function is kept for backward compatibility with user-created events that may use JSON
 */
export function parseGroupMetadata(content: string): Record<string, string | boolean | undefined> {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Format group metadata as tags for NIP-29 events (9002 edit-metadata)
 */
export function formatGroupMetadataAsTags(metadata: Record<string, string | boolean | undefined>): string[][] {
  const tags: string[][] = [];
  
  if (metadata.name && typeof metadata.name === 'string') {
    tags.push(['name', metadata.name]);
  }
  if (metadata.about && typeof metadata.about === 'string') {
    tags.push(['about', metadata.about]);
  }
  if (metadata.picture && typeof metadata.picture === 'string') {
    tags.push(['picture', metadata.picture]);
  }
  
  // Privacy flag - single value tag
  if (metadata.public === true || metadata.private === false) {
    tags.push(['public']);
  } else {
    tags.push(['private']);
  }
  
  // Open/closed flag - single value tag
  if (metadata.open === true || metadata.closed === false) {
    tags.push(['open']);
  } else {
    tags.push(['closed']);
  }
  
  // Broadcast flag
  if (metadata.broadcast === true) {
    tags.push(['broadcast']);
  } else if (metadata.broadcast === false) {
    tags.push(['nonbroadcast']);
  }
  
  return tags;
}

/**
 * @deprecated Use formatGroupMetadataAsTags instead for NIP-29 compliance
 */
export function formatGroupMetadata(metadata: Record<string, string | boolean | undefined>): string {
  return JSON.stringify(metadata);
}
