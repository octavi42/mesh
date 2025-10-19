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
  roles: string[];
  joinedAt: number;
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
  nip29Members: EntityTable<NIP29Member, 'groupId'>;
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

export { db };

let isSeeding = false;

export async function seedMockData() {
  if (isSeeding) return;

  const workspaceCount = await db.workspaces.count();

  if (workspaceCount === 0) {
    isSeeding = true;
    const workspaces: Workspace[] = [
      {
        id: 'workspace-1',
        name: 'My Team',
        description: 'Default workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'workspace-2',
        name: 'Side Project',
        description: 'Side project workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'workspace-3',
        name: 'Freelance',
        description: 'Freelance workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    await db.workspaces.bulkAdd(workspaces);

    const channels: Channel[] = [
      {
        id: 'channel-1',
        workspaceId: 'workspace-1',
        name: 'general',
        description: 'General discussion',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-2',
        workspaceId: 'workspace-1',
        name: 'random',
        description: 'Random stuff',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-3',
        workspaceId: 'workspace-1',
        name: 'dev',
        description: 'Development discussion',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-4',
        workspaceId: 'workspace-2',
        name: 'general',
        description: 'Side project general chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-5',
        workspaceId: 'workspace-2',
        name: 'ideas',
        description: 'Project ideas',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-6',
        workspaceId: 'workspace-2',
        name: 'design',
        description: 'Design discussion',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-7',
        workspaceId: 'workspace-3',
        name: 'general',
        description: 'Freelance general chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-8',
        workspaceId: 'workspace-3',
        name: 'clients',
        description: 'Client discussions',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'channel-9',
        workspaceId: 'workspace-3',
        name: 'invoices',
        description: 'Invoice tracking',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    await db.channels.bulkAdd(channels);

    const messages: Message[] = [
      {
        id: 'msg-1',
        channelId: 'channel-1',
        authorPubkey: 'npub1alice',
        content: 'Welcome to the team!',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'msg-2',
        channelId: 'channel-1',
        authorPubkey: 'npub1bob',
        content: 'Thanks! Excited to be here.',
        createdAt: Date.now() - 3000000,
        updatedAt: Date.now() - 3000000,
      },
      {
        id: 'msg-3',
        channelId: 'channel-2',
        authorPubkey: 'npub1alice',
        content: 'Anyone up for coffee?',
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now() - 1800000,
      },
      {
        id: 'msg-4',
        channelId: 'channel-3',
        authorPubkey: 'npub1bob',
        content: 'Just pushed the latest changes.',
        createdAt: Date.now() - 900000,
        updatedAt: Date.now() - 900000,
      },
      {
        id: 'msg-5',
        channelId: 'channel-4',
        authorPubkey: 'npub1alice',
        content: 'Starting work on the new feature!',
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now() - 7200000,
      },
      {
        id: 'msg-6',
        channelId: 'channel-4',
        authorPubkey: 'npub1bob',
        content: 'Let me know if you need any help.',
        createdAt: Date.now() - 6000000,
        updatedAt: Date.now() - 6000000,
      },
      {
        id: 'msg-7',
        channelId: 'channel-5',
        authorPubkey: 'npub1alice',
        content: 'What if we add a dark mode?',
        createdAt: Date.now() - 4800000,
        updatedAt: Date.now() - 4800000,
      },
      {
        id: 'msg-8',
        channelId: 'channel-6',
        authorPubkey: 'npub1bob',
        content: 'Here are the latest mockups.',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'msg-9',
        channelId: 'channel-7',
        authorPubkey: 'npub1alice',
        content: 'Client meeting went well today.',
        createdAt: Date.now() - 10800000,
        updatedAt: Date.now() - 10800000,
      },
      {
        id: 'msg-10',
        channelId: 'channel-8',
        authorPubkey: 'npub1bob',
        content: 'Client A approved the proposal!',
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now() - 7200000,
      },
      {
        id: 'msg-11',
        channelId: 'channel-9',
        authorPubkey: 'npub1alice',
        content: 'Invoice #123 sent to Client B.',
        createdAt: Date.now() - 5400000,
        updatedAt: Date.now() - 5400000,
      },
    ];

    await db.messages.bulkAdd(messages);
    isSeeding = false;
  }
}
