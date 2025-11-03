import { NostrDataService } from '@/lib/services/nostr-data-service';
import { NostrRelayManager } from '@/lib/services/nostr-relay-manager';
import type { NostrSession } from '@/lib/auth/types';
import type { NIP29Workspace } from '@/lib/db/schema';

export interface DataInitializationResult {
  workspaces: NIP29Workspace[];
  currentWorkspace: NIP29Workspace | null;
  errors: string[];
}

export interface DataCoordinatorEvents {
  onWorkspacesLoaded: (workspaces: NIP29Workspace[]) => void;
  onCurrentWorkspaceSet: (workspace: NIP29Workspace) => void;
  onError: (error: string) => void;
  onLoadingStateChange: (loading: boolean) => void;
}

export class DataCoordinator {
  private static instance: DataCoordinator;
  private dataService: NostrDataService;
  private relayManager: NostrRelayManager;
  private eventListeners: Partial<DataCoordinatorEvents> = {};
  private currentSession: NostrSession | null = null;

  static getInstance(): DataCoordinator {
    if (!DataCoordinator.instance) {
      DataCoordinator.instance = new DataCoordinator();
    }
    return DataCoordinator.instance;
  }

  constructor() {
    this.dataService = NostrDataService.getInstance();
    this.relayManager = NostrRelayManager.getInstance();
  }

  // Set event listeners for coordinating with stores
  setEventListeners(listeners: Partial<DataCoordinatorEvents>): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }

  // Main initialization flow after user authentication
  async initializeUserData(session: NostrSession): Promise<DataInitializationResult> {
    console.log('🚀 DataCoordinator: Initializing user data for:', session.pubkey.substring(0, 8));

    this.currentSession = session;
    const errors: string[] = [];

    try {
      this.emit('onLoadingStateChange', true);

      // Phase 1: Initialize services
      await this.initializeServices();

      // Phase 2: Load essential data
      const workspaces = await this.loadEssentialData(session.pubkey);

      // Phase 3: Set current workspace
      const currentWorkspace = this.selectDefaultWorkspace(workspaces);

      // Phase 4: Update stores immediately with essential data
      this.updateStores(workspaces, currentWorkspace);

      // Phase 5: Load additional data in background (non-blocking)
      this.loadAdditionalDataInBackground(session.pubkey, workspaces);

      this.emit('onLoadingStateChange', false);

      console.log('✅ DataCoordinator: User data initialization complete');

      return {
        workspaces,
        currentWorkspace,
        errors,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('❌ DataCoordinator: Initialization failed:', errorMessage);

      errors.push(errorMessage);
      this.emit('onError', errorMessage);
      this.emit('onLoadingStateChange', false);

      return {
        workspaces: [],
        currentWorkspace: null,
        errors,
      };
    }
  }

  // Handle user workspace creation
  async createWorkspace(params: { name: string; description?: string; picture?: string; isOpen?: boolean }): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No authenticated session available');
    }

    console.log('🏗️ DataCoordinator: Creating workspace:', params.name);

    try {
      const groupId = await this.dataService.createWorkspace(params, this.currentSession.pubkey);

      // Refresh workspaces after creation
      setTimeout(() => {
        this.refreshWorkspaces();
      }, 2000); // Give relay time to process

      return groupId;
    } catch (error) {
      console.error('❌ DataCoordinator: Failed to create workspace:', error);
      throw error;
    }
  }

  // Handle workspace switching
  async switchWorkspace(groupId: string): Promise<void> {
    console.log('🔄 DataCoordinator: Switching to workspace:', groupId);

    try {
      // Start sync in background - don't block UI
      this.syncWorkspaceInBackground(groupId);

      // TODO: Also trigger channel sync for the workspace
      // This would be coordinated with a ChannelCoordinator in the future

    } catch (error) {
      console.error('❌ DataCoordinator: Failed to switch workspace:', error);
      this.emit('onError', `Failed to switch workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Refresh workspaces from both cache and relay
  async refreshWorkspaces(): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ DataCoordinator: No session available for refresh');
      return;
    }

    console.log('🔄 DataCoordinator: Refreshing workspaces...');

    try {
      const workspaces = await this.loadEssentialData(this.currentSession.pubkey);
      this.emit('onWorkspacesLoaded', workspaces);
    } catch (error) {
      console.error('❌ DataCoordinator: Failed to refresh workspaces:', error);
      this.emit('onError', 'Failed to refresh workspaces');
    }
  }

  // Clean up on user logout
  async cleanup(): Promise<void> {
    console.log('🧹 DataCoordinator: Cleaning up...');

    this.currentSession = null;
    this.eventListeners = {};

    try {
      await this.relayManager.disconnect();
    } catch (error) {
      console.error('❌ DataCoordinator: Cleanup error:', error);
    }
  }

  // Private methods

  private async initializeServices(): Promise<void> {
    console.log('🔧 DataCoordinator: Initializing services...');

    try {
      await this.relayManager.connect();
      console.log('✅ DataCoordinator: Services initialized');
    } catch (error) {
      console.error('❌ DataCoordinator: Service initialization failed:', error);
      throw new Error('Failed to initialize relay connection');
    }
  }

  private async loadEssentialData(pubkey: string): Promise<NIP29Workspace[]> {
    console.log('📂 DataCoordinator: Loading essential data...');

    try {
      // Load cached workspaces first for immediate UI update
      const cachedWorkspaces = await this.dataService.fetchCachedWorkspaces();
      console.log('📂 Loaded', cachedWorkspaces.length, 'cached workspaces');

      // Update UI immediately with cached data
      if (cachedWorkspaces.length > 0) {
        this.emit('onWorkspacesLoaded', cachedWorkspaces);
      }

      // Discover new workspaces from relay
      const discoveredWorkspaces = await this.dataService.discoverWorkspaces(pubkey);
      console.log('🔍 Discovered', discoveredWorkspaces.length, 'new workspaces');

      // Get fresh list after discovery
      const allWorkspaces = await this.dataService.fetchCachedWorkspaces();
      console.log('📂 Total workspaces after discovery:', allWorkspaces.length);

      return allWorkspaces;
    } catch (error) {
      console.error('❌ DataCoordinator: Failed to load essential data:', error);
      // Return cached data even if discovery fails
      return await this.dataService.fetchCachedWorkspaces();
    }
  }

  private selectDefaultWorkspace(workspaces: NIP29Workspace[]): NIP29Workspace | null {
    if (workspaces.length === 0) return null;

    // Select most recently updated workspace
    const sorted = [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted[0];
  }

  private updateStores(workspaces: NIP29Workspace[], currentWorkspace: NIP29Workspace | null): void {
    console.log('🔄 DataCoordinator: Updating stores...');

    this.emit('onWorkspacesLoaded', workspaces);

    if (currentWorkspace) {
      this.emit('onCurrentWorkspaceSet', currentWorkspace);
    }
  }

  private loadAdditionalDataInBackground(pubkey: string, workspaces: NIP29Workspace[]): void {
    console.log('🔄 DataCoordinator: Starting background data loading...');

    // Run background operations without blocking UI
    Promise.allSettled([
      this.syncAllWorkspacesInBackground(workspaces),
      // TODO: Load channels for current workspace
      // TODO: Check for invites
      // TODO: Sync user metadata
    ]).then((results) => {
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);

      if (errors.length > 0) {
        console.warn('⚠️ DataCoordinator: Some background operations failed:', errors);
      } else {
        console.log('✅ DataCoordinator: Background data loading complete');
      }
    });
  }

  private async syncAllWorkspacesInBackground(workspaces: NIP29Workspace[]): Promise<void> {
    console.log('🔄 DataCoordinator: Syncing all workspaces in background...');

    const syncPromises = workspaces.map(workspace =>
      this.dataService.syncWorkspace(workspace.groupId)
        .catch(error => {
          console.warn(`⚠️ Failed to sync workspace ${workspace.groupId}:`, error);
          return null;
        })
    );

    await Promise.allSettled(syncPromises);
    console.log('✅ DataCoordinator: Background workspace sync complete');
  }

  private async syncWorkspaceInBackground(groupId: string): Promise<void> {
    try {
      await this.dataService.syncWorkspace(groupId);
      console.log('✅ DataCoordinator: Workspace synced:', groupId);
    } catch (error) {
      console.warn('⚠️ DataCoordinator: Failed to sync workspace:', error);
    }
  }

  private emit<K extends keyof DataCoordinatorEvents>(
    event: K,
    ...args: Parameters<DataCoordinatorEvents[K]>
  ): void {
    const listener = this.eventListeners[event];
    if (listener) {
      try {
        (listener as any)(...args);
      } catch (error) {
        console.error(`❌ DataCoordinator: Event listener error for ${event}:`, error);
      }
    }
  }
}