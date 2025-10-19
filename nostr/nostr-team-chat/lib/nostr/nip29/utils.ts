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

export function parseGroupMetadata(content: string): Record<string, string | boolean | undefined> {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function formatGroupMetadata(metadata: Record<string, string | boolean | undefined>): string {
  return JSON.stringify(metadata);
}
