import { NDK, NDKKind } from '@nostr-dev-kit/ndk';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  picture?: string;
  isPublic: boolean;
  isClosed: boolean;
  isBroadcast: boolean;
  relay?: string;
  createdAt: number;
  updatedAt: number;
  members: string[];
  admins: string[];
  memberCount: number;
  adminCount: number;
  scope: string;
}

interface WorkspaceCache {
  workspaces: Workspace[];
  timestamp: number;
  fetched: boolean;
}

interface FetchOptions {
  forceRefresh?: boolean;
  timeout?: number;
}

/**
 * Manages workspace data fetching with proper per-user caching
 * Replaces the problematic global `workspacesFetched` flag
 */
export class WorkspaceDataManager {
  private userCache = new Map<string, WorkspaceCache>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  constructor(private ndk: NDK) {}

  /**
   * Check if workspaces should be refetched for a user
   */
  shouldRefetchWorkspaces(pubkey: string, forceRefresh = false): boolean {
    if (forceRefresh) return true;

    const cache = this.userCache.get(pubkey);
    if (!cache || !cache.fetched) return true;

    // Refetch if cache is expired
    return Date.now() - cache.timestamp > this.CACHE_DURATION;
  }

  /**
   * Get cached workspaces for a user
   */
  getCachedWorkspaces(pubkey: string): Workspace[] {
    const cache = this.userCache.get(pubkey);
    return cache?.workspaces || [];
  }

  /**
   * Mark workspaces as fetched for a user
   */
  markWorkspacesFetched(pubkey: string, workspaces: Workspace[]): void {
    this.userCache.set(pubkey, {
      workspaces,
      timestamp: Date.now(),
      fetched: true
    });

    console.log(`✅ Cached ${workspaces.length} workspaces for user:`, pubkey.slice(0, 8));
  }

  /**
   * Clear cache for a specific user (useful on logout)
   */
  clearUserCache(pubkey: string): void {
    this.userCache.delete(pubkey);
    console.log('🧹 Cleared workspace cache for user:', pubkey.slice(0, 8));
  }

  /**
   * Clear all cache (useful on app reset)
   */
  clearAllCache(): void {
    this.userCache.clear();
    console.log('🧹 Cleared all workspace cache');
  }

  /**
   * Fetch workspace metadata for a user
   */
  async fetchWorkspaceMetadata(pubkey: string, options: FetchOptions = {}): Promise<Workspace[]> {
    const { forceRefresh = false, timeout = this.DEFAULT_TIMEOUT } = options;

    // Check if we should refetch
    if (!this.shouldRefetchWorkspaces(pubkey, forceRefresh)) {
      console.log('📦 Using cached workspaces for user:', pubkey.slice(0, 8));
      return this.getCachedWorkspaces(pubkey);
    }

    console.log('🔍 Fetching workspace metadata for user:', pubkey.slice(0, 8));

    // Retry logic - attempt up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📡 Fetch attempt ${attempt}/3 for user:`, pubkey.slice(0, 8));
        return await this.performFetch(pubkey, timeout);
      } catch (error) {
        console.warn(`❌ Fetch attempt ${attempt}/3 failed:`, error.message);

        if (attempt === 3) {
          // Final attempt failed, throw the error
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Internal method to perform the actual fetch (extracted for retry logic)
   */
  private async performFetch(pubkey: string, timeout: number): Promise<Workspace[]> {
    try {
      // Check NDK connection
      if (!this.ndk) {
        throw new Error('NDK not available');
      }

      // Wait for relay connection with timeout
      await this.waitForConnection(timeout);

      // Fetch workspace-related events
      const metadataKinds: NDKKind[] = [39000, 39001, 39002, 9007];

      const workspaces = await Promise.race([
        this.fetchWorkspaceEvents(metadataKinds, pubkey),
        this.createTimeoutPromise(timeout, 'Workspace fetch timeout')
      ]);

      // Cache the results
      this.markWorkspacesFetched(pubkey, workspaces);

      return workspaces;
    } catch (error) {
      console.error('❌ Failed to fetch workspace metadata:', error);

      // Return cached data if available
      const cached = this.getCachedWorkspaces(pubkey);
      if (cached.length > 0) {
        console.log('📦 Falling back to cached workspaces');
        return cached;
      }

      throw error;
    }
  }

  /**
   * Wait for NDK connection with timeout
   */
  private async waitForConnection(timeout: number): Promise<void> {
    return Promise.race([
      new Promise<void>((resolve) => {
        let attempts = 0;
        const checkConnection = () => {
          attempts++;
          const allRelays = Array.from(this.ndk.pool.relays.values());
          const connectedRelays = allRelays.filter(r => r.status === 2 || r.status === 5 || r.status === 6);
          const authenticatedRelays = allRelays.filter(r => r.status === 5);

          console.log(`🔍 WorkspaceDataManager connection check attempt ${attempts}:`, {
            totalRelays: allRelays.length,
            connectedRelays: connectedRelays.length,
            authenticatedRelays: authenticatedRelays.length,
            relayStates: allRelays.map(r => ({
              url: r.url,
              status: r.status,
              isAuthenticated: r.status === 5
            }))
          });

          // Prefer authenticated relays (status 5), fall back to connected (status 2, 6)
          if (authenticatedRelays.length > 0) {
            console.log('✅ Found authenticated relays, proceeding with workspace data fetch');
            resolve();
          } else if (connectedRelays.length > 0 && attempts > 30) { // After 3 seconds, accept connected relays
            console.log('⚠️ No authenticated relays found after 3s, proceeding with connected relays');
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      }),
      this.createTimeoutPromise(timeout, 'Connection timeout')
    ]);
  }

  /**
   * Fetch and process workspace events
   */
  private async fetchWorkspaceEvents(kinds: NDKKind[], pubkey: string): Promise<Workspace[]> {
    const filter = { kinds, limit: 500 };
    const events = await this.ndk.fetchEvents(filter);

    console.log(`📜 Found ${events.size} workspace events`);

    // Process events into workspaces
    const workspacesMap = new Map<string, Workspace>();
    const groupAdmins = new Map<string, string[]>();
    const groupMembers = new Map<string, string[]>();

    for (const event of events) {
      try {
        const groupId = event.tags.find(tag => tag[0] === 'h' || tag[0] === 'd')?.[1];
        if (!groupId) continue;

        switch (event.kind) {
          case 39000: // Group metadata
            this.processMetadataEvent(event, groupId, workspacesMap, groupAdmins, groupMembers);
            break;
          case 39001: // Group admins
            this.processAdminsEvent(event, groupId, groupAdmins);
            break;
          case 39002: // Group members
            this.processMembersEvent(event, groupId, groupMembers);
            break;
          case 9007: // Group creation
            this.processCreationEvent(event, groupId, workspacesMap, groupAdmins, groupMembers);
            break;
        }
      } catch (error) {
        console.warn('Failed to process event:', event.id, error);
      }
    }

    // Filter workspaces where user is a member or admin
    const userWorkspaces = Array.from(workspacesMap.values()).filter(workspace => {
      const isAdmin = workspace.admins.includes(pubkey);
      const isMember = workspace.members.includes(pubkey);
      return isAdmin || isMember;
    });

    console.log(`✅ Processed ${userWorkspaces.length} workspaces for user`);
    return userWorkspaces;
  }

  private processMetadataEvent(
    event: any,
    groupId: string,
    workspacesMap: Map<string, Workspace>,
    groupAdmins: Map<string, string[]>,
    groupMembers: Map<string, string[]>
  ): void {
    let groupName = 'Unnamed Group';
    let about: string | undefined;
    let picture: string | undefined;
    let isPrivate = true;
    let isClosed = true;
    let isBroadcast = false;

    for (const tag of event.tags) {
      const [tagType, value] = tag;
      switch (tagType) {
        case 'name': groupName = value || groupName; break;
        case 'about': about = value; break;
        case 'picture': picture = value; break;
        case 'private': isPrivate = true; break;
        case 'public': isPrivate = false; break;
        case 'open': isClosed = false; break;
        case 'closed': isClosed = true; break;
        case 'broadcast': isBroadcast = true; break;
        case 'nonbroadcast': isBroadcast = false; break;
      }
    }

    const workspace: Workspace = {
      id: groupId,
      name: groupName,
      description: about,
      picture: picture,
      isPublic: !isPrivate,
      isClosed: isClosed,
      isBroadcast: isBroadcast,
      relay: event.relay?.url,
      createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
      updatedAt: Date.now(),
      members: groupMembers.get(groupId) || [],
      admins: groupAdmins.get(groupId) || [],
      memberCount: groupMembers.get(groupId)?.length || 0,
      adminCount: groupAdmins.get(groupId)?.length || 0,
      scope: 'Default'
    };

    workspacesMap.set(groupId, workspace);
  }

  private processAdminsEvent(event: any, groupId: string, groupAdmins: Map<string, string[]>): void {
    const adminPubkeys = event.tags
      .filter((tag: string[]) => tag[0] === 'p')
      .map((tag: string[]) => tag[1])
      .filter(Boolean);

    groupAdmins.set(groupId, adminPubkeys);
  }

  private processMembersEvent(event: any, groupId: string, groupMembers: Map<string, string[]>): void {
    const memberPubkeys = event.tags
      .filter((tag: string[]) => tag[0] === 'p')
      .map((tag: string[]) => tag[1])
      .filter(Boolean);

    groupMembers.set(groupId, memberPubkeys);
  }

  private processCreationEvent(
    event: any,
    groupId: string,
    workspacesMap: Map<string, Workspace>,
    groupAdmins: Map<string, string[]>,
    groupMembers: Map<string, string[]>
  ): void {
    if (!workspacesMap.has(groupId)) {
      let metadata: any = {};
      try {
        metadata = event.content ? JSON.parse(event.content) : {};
      } catch {
        // Invalid JSON, use defaults
      }

      const workspace: Workspace = {
        id: groupId,
        name: metadata.name || 'New Group',
        description: metadata.about,
        picture: metadata.picture,
        isPublic: metadata.public === true,
        isClosed: metadata.closed !== false,
        isBroadcast: metadata.broadcast === true,
        relay: event.relay?.url,
        createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
        updatedAt: Date.now(),
        members: groupMembers.get(groupId) || [],
        admins: groupAdmins.get(groupId) || [],
        memberCount: groupMembers.get(groupId)?.length || 0,
        adminCount: groupAdmins.get(groupId)?.length || 0,
        scope: 'Default'
      };

      workspacesMap.set(groupId, workspace);
    }
  }

  private createTimeoutPromise<T>(timeout: number, message: string): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeout)
    );
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { totalUsers: number; totalWorkspaces: number; cacheAge: Record<string, number> } {
    const stats = {
      totalUsers: this.userCache.size,
      totalWorkspaces: 0,
      cacheAge: {} as Record<string, number>
    };

    for (const [pubkey, cache] of this.userCache.entries()) {
      stats.totalWorkspaces += cache.workspaces.length;
      stats.cacheAge[pubkey.slice(0, 8)] = Date.now() - cache.timestamp;
    }

    return stats;
  }
}