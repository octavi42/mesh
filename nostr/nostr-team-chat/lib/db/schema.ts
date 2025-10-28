import Dexie, { type EntityTable } from 'dexie';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NIP29Workspace {
  groupId: string;
  relayUrl: string;
  name: string;
  description?: string;
  picture?: string;
  isOpen: boolean;
  isPublic: boolean;
  admins: string[];
  members: string[];
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
}

export interface NIP29Member {
  groupId: string;
  pubkey: string;
  role: string;
  joinedAt: number;
  permissions?: string[];
}

export interface Notification {
  id: string;
  userId: string; // recipient pubkey
  type: 'invite' | 'mention' | 'message' | 'join_request';
  title: string;
  message: string;
  data: Record<string, unknown>; // JSON data (invite code, workspace info, etc.)
  read: boolean;
  createdAt: number;
}

export interface Invite {
  code: string;
  groupId: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  usedCount: number;
  role: string;
  isActive: boolean;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  channelId: string;
  authorPubkey: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie('NostrTeamChat') as Dexie & {
  workspaces: EntityTable<Workspace, 'id'>;
  channels: EntityTable<Channel, 'id'>;
  messages: EntityTable<Message, 'id'>;
  nip29Workspaces: EntityTable<NIP29Workspace, 'groupId'>;
  nip29Members: EntityTable<NIP29Member, '[groupId+pubkey]'>;
  invites: EntityTable<Invite, 'code'>;
  notifications: EntityTable<Notification, 'id'>;
};

db.version(1).stores({
  workspaces: 'id, name, createdAt',
  channels: 'id, workspaceId, name, createdAt',
  messages: 'id, channelId, authorPubkey, createdAt',
});

db.version(2).stores({
  workspaces: 'id, name, createdAt',
  channels: 'id, workspaceId, name, createdAt',
  messages: 'id, channelId, authorPubkey, createdAt',
  nip29Workspaces: 'groupId, relayUrl, name, createdAt, lastSyncedAt',
  nip29Members: '[groupId+pubkey], groupId, pubkey, joinedAt',
});

db.version(3).stores({
  workspaces: 'id, name, createdAt',
  channels: 'id, workspaceId, name, createdAt',
  messages: 'id, channelId, authorPubkey, createdAt',
  nip29Workspaces: 'groupId, relayUrl, name, createdAt, lastSyncedAt',
  nip29Members: '[groupId+pubkey], groupId, pubkey, joinedAt',
  invites: 'code, groupId, createdBy, createdAt, expiresAt, isActive',
});

db.version(4).stores({
  workspaces: 'id, name, createdAt',
  channels: 'id, workspaceId, name, createdAt',
  messages: 'id, channelId, authorPubkey, createdAt',
  nip29Workspaces: 'groupId, relayUrl, name, createdAt, lastSyncedAt',
  nip29Members: '[groupId+pubkey], groupId, pubkey, joinedAt',
  invites: 'code, groupId, createdBy, createdAt, expiresAt, isActive',
  notifications: 'id, userId, type, createdAt, read',
});

export { db };
