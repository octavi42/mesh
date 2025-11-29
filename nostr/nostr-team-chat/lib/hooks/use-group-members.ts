import { useState, useEffect, useCallback } from 'react';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29/client-transition';
import { waitForNDKInitialization } from '@/lib/nostr/ndk-relay-client';
import { NIP29EventKind } from '@/lib/nostr/nip29/types';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';

export interface GroupMember {
  pubkey: string;
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  isAdmin: boolean;
  role?: string;
  joinedAt?: number;
  lastSeen?: number;
}

export interface UserProfile {
  pubkey: string;
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  banner?: string;
  website?: string;
  lud06?: string;
  lud16?: string;
}

interface UseGroupMembersOptions {
  groupId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useGroupMembers(options: UseGroupMembersOptions = {}) {
  const { groupId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [lastGroupId, setLastGroupId] = useState<string | undefined>(undefined);

  const { workspaces } = useWorkspaceStore();
  const workspace = groupId ? workspaces.find(w => w.id === groupId) : null;

  // Get current user's pubkey to filter them out of display
  const { useAuthStore } = require('@/lib/stores/auth-store');
  const { pubkey: currentUserPubkey } = useAuthStore();

  // Reset members when groupId changes
  useEffect(() => {
    if (groupId !== lastGroupId) {
      console.log('🔄 Group ID changed, resetting members:', { old: lastGroupId?.slice(0, 8), new: groupId?.slice(0, 8) });
      setMembers([]);
      setProfiles(new Map());
      setLastFetched(0);
      setLastGroupId(groupId);
    }
  }, [groupId, lastGroupId]);

  // Simple cache to avoid refetching recently fetched data
  const cacheTimeMs = 30000; // 30 seconds
  const isCacheValid = useCallback(() => {
    return Date.now() - lastFetched < cacheTimeMs;
  }, [lastFetched]);

  // Generate avatar URL for users without profile pictures
  const generateAvatarUrl = useCallback((pubkey: string, name?: string) => {
    const seed = name || pubkey.slice(0, 8);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }, []);

  // Fetch user profiles from kind:0 events
  const fetchUserProfiles = useCallback(async (pubkeys: string[]): Promise<Map<string, UserProfile>> => {
    if (pubkeys.length === 0) return new Map();

    try {
      const client = getGlobalNIP29Client();

      if (!client.isConnected()) {
        await client.connect();
      }

      // Fetch kind:0 (user metadata) events for all pubkeys
      const profileEvents = await client.fetchEvents({
        kinds: [0], // User metadata
        authors: pubkeys,
        limit: pubkeys.length * 2, // Allow for multiple profiles per user
      });

      const profileMap = new Map<string, UserProfile>();

      // Process profile events (keep the latest for each pubkey)
      const latestProfiles = new Map<string, any>();

      for (const event of profileEvents) {
        const existing = latestProfiles.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestProfiles.set(event.pubkey, event);
        }
      }

      // Parse profile data
      for (const [pubkey, event] of latestProfiles) {
        try {
          const metadata = JSON.parse(event.content);

          const profile: UserProfile = {
            pubkey,
            name: metadata.name,
            displayName: metadata.display_name || metadata.displayName,
            picture: metadata.picture,
            about: metadata.about,
            nip05: metadata.nip05,
            banner: metadata.banner,
            website: metadata.website,
            lud06: metadata.lud06,
            lud16: metadata.lud16,
          };

          profileMap.set(pubkey, profile);
        } catch (parseError) {
          // Skip invalid profile data
        }
      }

      // Generate fallback profiles for users without kind:0 events
      for (const pubkey of pubkeys) {
        if (!profileMap.has(pubkey)) {
          const fallbackProfile: UserProfile = {
            pubkey,
            name: `User ${pubkey.slice(0, 8)}`,
            picture: generateAvatarUrl(pubkey),
          };
          profileMap.set(pubkey, fallbackProfile);
        }
      }

      return profileMap;
    } catch (error) {
      // Return fallback profiles on error
      const fallbackMap = new Map<string, UserProfile>();
      for (const pubkey of pubkeys) {
        fallbackMap.set(pubkey, {
          pubkey,
          name: `User ${pubkey.slice(0, 8)}`,
          picture: generateAvatarUrl(pubkey),
        });
      }
      return fallbackMap;
    }
  }, [generateAvatarUrl]);

  // Fetch group members from relay
  const fetchGroupMembers = useCallback(async (targetGroupId: string): Promise<GroupMember[]> => {
    if (!targetGroupId) return [];

    try {
      setError(null);

      // Wait for NDK to be initialized before proceeding
      let client;
      try {
        client = await waitForNDKInitialization(8000);
        console.log('✅ NDK ready for group members fetch');
      } catch (error) {
        console.log('⏳ NDK not ready for group members, skipping for now');
        return [];
      }

      // Connect if needed
      if (!client.isConnected()) {
        await client.connect();
      }

      const parts = targetGroupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : targetGroupId;

      let memberPubkeys: string[] = [];
      let adminPubkeys: string[] = [];

      // Priority: Use workspace data if available (more efficient)
      if (workspace && (workspace.members?.length || workspace.admins?.length)) {
        memberPubkeys = workspace.members || [];
        adminPubkeys = workspace.admins || [];
        console.log(`📊 Using cached workspace member data for ${targetGroupId}:`, {
          members: memberPubkeys.length,
          admins: adminPubkeys.length
        });
      } else {
        // Fallback: Fetch from relay if workspace data not available
        try {
          console.log(`🔄 Fetching fresh member data from relay for ${targetGroupId}`);
          const [memberListEvents, adminListEvents] = await Promise.all([
            client.fetchEvents({
              kinds: [39002], // NIP-29 member list
              '#h': [localGroupId],
              limit: 1
            }),
            client.fetchEvents({
              kinds: [39001], // NIP-29 admin list
              '#h': [localGroupId],
              limit: 1
            })
          ]);

          // Extract member pubkeys
          if (memberListEvents.length > 0) {
            memberListEvents[0].tags.forEach(tag => {
              if (tag[0] === 'p') {
                memberPubkeys.push(tag[1]);
              }
            });
          }

          // Extract admin pubkeys
          if (adminListEvents.length > 0) {
            adminListEvents[0].tags.forEach(tag => {
              if (tag[0] === 'p') {
                adminPubkeys.push(tag[1]);
              }
            });
          }

          console.log(`📊 Fetched fresh member data for ${targetGroupId}:`, {
            members: memberPubkeys.length,
            admins: adminPubkeys.length
          });
        } catch (error) {
          console.warn('Failed to fetch NIP-29 member/admin lists:', error);
        }
      }

      // Final fallback: Current user only
      if (memberPubkeys.length === 0) {
        const { useAuthStore } = await import('@/lib/stores/auth-store');
        const currentUserPubkey = useAuthStore.getState().pubkey;
        if (currentUserPubkey) {
          memberPubkeys = [currentUserPubkey];
        }
      }

      // Combine all unique pubkeys
      const allPubkeys = [...new Set([...memberPubkeys, ...adminPubkeys])];

      if (allPubkeys.length === 0) {
        return [];
      }

      // Fetch user profiles
      const profileMap = await fetchUserProfiles(allPubkeys);
      setProfiles(profileMap);

      // Create member objects
      const groupMembers: GroupMember[] = allPubkeys.map(pubkey => {
        const profile = profileMap.get(pubkey);
        const isAdmin = adminPubkeys.includes(pubkey);

        return {
          pubkey,
          name: profile?.displayName || profile?.name || `User ${pubkey.slice(0, 8)}`,
          displayName: profile?.displayName,
          picture: profile?.picture || generateAvatarUrl(pubkey, profile?.name),
          about: profile?.about,
          nip05: profile?.nip05,
          isAdmin,
          role: isAdmin ? 'admin' : 'member',
        };
      });

      // Sort: admins first, then by name
      groupMembers.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setLastFetched(Date.now());
      return groupMembers;

    } catch (error) {
      console.error('Failed to fetch group members:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch group members');
      return [];
    }
  }, [workspace, fetchUserProfiles, generateAvatarUrl]);

  // Refresh members data
  const refreshMembers = useCallback(async (force = false) => {
    if (!groupId) return;

    // Skip if cache is valid and not forcing refresh
    if (!force && isCacheValid() && members.length > 0) {
      return;
    }

    setLoading(true);
    try {
      const freshMembers = await fetchGroupMembers(groupId);
      setMembers(freshMembers);
    } finally {
      setLoading(false);
    }
  }, [groupId, fetchGroupMembers, isCacheValid, members.length]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !groupId) return;

    const interval = setInterval(refreshMembers, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, groupId, refreshInterval, refreshMembers]);

  // Initial fetch effect - force refresh when groupId changes
  useEffect(() => {
    if (groupId) {
      // Always force refresh when this effect runs (groupId changed or component mounted)
      refreshMembers(true);
    }
  }, [groupId]); // Only depend on groupId, not refreshMembers to avoid infinite loop

  // Get member by pubkey
  const getMember = useCallback((pubkey: string) => {
    return members.find(m => m.pubkey === pubkey);
  }, [members]);

  // Check if user is admin
  const isAdmin = useCallback((pubkey: string) => {
    return members.some(m => m.pubkey === pubkey && m.isAdmin);
  }, [members]);

  // Check if user is member
  const isMember = useCallback((pubkey: string) => {
    return members.some(m => m.pubkey === pubkey);
  }, [members]);

  // Get members formatted for UserAvatars component (excluding current user)
  const getAvatarUsers = useCallback(() => {
    const filteredMembers = members.filter(member => member.pubkey !== currentUserPubkey);
    console.log(`👥 Filtering members for display:`, {
      totalMembers: members.length,
      currentUser: currentUserPubkey?.slice(0, 8),
      filteredCount: filteredMembers.length,
      displayedMembers: filteredMembers.map(m => m.name).slice(0, 3)
    });

    return filteredMembers.map((member, index) => ({
      id: member.pubkey,
      name: member.name,
      image: member.picture || generateAvatarUrl(member.pubkey, member.name),
      pubkey: member.pubkey,
      role: member.role,
    }));
  }, [members, currentUserPubkey, generateAvatarUrl]);

  return {
    members,
    profiles,
    loading,
    error,
    lastFetched,
    refreshMembers,
    forceRefresh: () => refreshMembers(true),
    getMember,
    isAdmin,
    isMember,
    getAvatarUsers,
    // Stats
    memberCount: members.length,
    displayedMemberCount: members.filter(m => m.pubkey !== currentUserPubkey).length, // For UI display
    adminCount: members.filter(m => m.isAdmin).length,
    regularMemberCount: members.filter(m => !m.isAdmin).length,
  };
}