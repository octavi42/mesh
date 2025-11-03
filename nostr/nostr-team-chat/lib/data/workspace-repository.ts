import { db, type NIP29Workspace } from '@/lib/db/schema';

export interface WorkspaceRepository {
  findAll(): Promise<NIP29Workspace[]>;
  findById(groupId: string): Promise<NIP29Workspace | undefined>;
  save(workspace: NIP29Workspace): Promise<void>;
  update(groupId: string, updates: Partial<NIP29Workspace>): Promise<void>;
  delete(groupId: string): Promise<void>;
  clear(): Promise<void>;
  findByUser(pubkey: string): Promise<NIP29Workspace[]>;
}

export class IndexedDBWorkspaceRepository implements WorkspaceRepository {
  async findAll(): Promise<NIP29Workspace[]> {
    try {
      const workspaces = await db.nip29Workspaces.toArray();
      console.log('📂 Repository: Found', workspaces.length, 'workspaces');
      return workspaces;
    } catch (error) {
      console.error('❌ Repository: Failed to fetch workspaces:', error);
      throw new Error('Failed to fetch workspaces from local storage');
    }
  }

  async findById(groupId: string): Promise<NIP29Workspace | undefined> {
    try {
      const workspace = await db.nip29Workspaces.get(groupId);
      console.log('📂 Repository: Workspace', groupId, workspace ? 'found' : 'not found');
      return workspace;
    } catch (error) {
      console.error('❌ Repository: Failed to fetch workspace:', error);
      throw new Error(`Failed to fetch workspace ${groupId}`);
    }
  }

  async save(workspace: NIP29Workspace): Promise<void> {
    try {
      await db.nip29Workspaces.add(workspace);
      console.log('✅ Repository: Saved workspace:', workspace.groupId);
    } catch (error) {
      console.error('❌ Repository: Failed to save workspace:', error);
      throw new Error('Failed to save workspace to local storage');
    }
  }

  async update(groupId: string, updates: Partial<NIP29Workspace>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
      };

      await db.nip29Workspaces.update(groupId, updateData);
      console.log('✅ Repository: Updated workspace:', groupId);
    } catch (error) {
      console.error('❌ Repository: Failed to update workspace:', error);
      throw new Error(`Failed to update workspace ${groupId}`);
    }
  }

  async delete(groupId: string): Promise<void> {
    try {
      await db.nip29Workspaces.delete(groupId);
      // Also clean up related data
      await db.nip29Members.where({ groupId }).delete();
      console.log('✅ Repository: Deleted workspace:', groupId);
    } catch (error) {
      console.error('❌ Repository: Failed to delete workspace:', error);
      throw new Error(`Failed to delete workspace ${groupId}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await db.nip29Workspaces.clear();
      await db.nip29Members.clear();
      console.log('✅ Repository: Cleared all workspace data');
    } catch (error) {
      console.error('❌ Repository: Failed to clear workspaces:', error);
      throw new Error('Failed to clear workspace data');
    }
  }

  async findByUser(pubkey: string): Promise<NIP29Workspace[]> {
    try {
      const workspaces = await db.nip29Workspaces
        .filter(workspace =>
          workspace.members?.includes(pubkey) ||
          workspace.admins?.includes(pubkey)
        )
        .toArray();

      console.log('📂 Repository: Found', workspaces.length, 'workspaces for user');
      return workspaces;
    } catch (error) {
      console.error('❌ Repository: Failed to fetch user workspaces:', error);
      throw new Error('Failed to fetch user workspaces');
    }
  }
}

// Singleton instance
export const workspaceRepository = new IndexedDBWorkspaceRepository();