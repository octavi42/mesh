import Dexie, { type EntityTable } from 'dexie';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
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
};

db.version(1).stores({
  workspaces: 'id, name, createdAt',
  channels: 'id, workspaceId, name, createdAt',
  messages: 'id, channelId, authorPubkey, createdAt',
});

export { db };

export async function seedMockData() {
  const workspaceCount = await db.workspaces.count();

  if (workspaceCount === 0) {
    const workspace: Workspace = {
      id: 'workspace-1',
      name: 'My Team',
      description: 'Default workspace',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.workspaces.add(workspace);

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
    ];

    await db.channels.bulkAdd(channels);
  }
}
