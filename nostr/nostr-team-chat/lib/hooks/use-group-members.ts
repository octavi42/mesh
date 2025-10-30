import { useState, useEffect, useCallback } from 'react';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29/client';
import { NIP29EventKind } from '@/lib/nostr/nip29/types';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

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

  const { workspaces } = useWorkspaceStore();
  const workspace = groupId ? workspaces.find(w => w.groupId === groupId) : null;

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

      console.log('🔍 Fetching profiles for', pubkeys.length, 'users');

      // Fetch kind:0 (user metadata) events for all pubkeys
      const profileEvents = await client.fetchEvents({
        kinds: [0], // User metadata
        authors: pubkeys,
        limit: pubkeys.length * 2, // Allow for multiple profiles per user
      });

      console.log('📋 Found', profileEvents.length, 'profile events for', pubkeys.length, 'pubkeys');
      console.log('🔍 Profile events:', profileEvents.map(e => ({ pubkey: e.pubkey.slice(0, 8), created_at: e.created_at })));

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
          console.warn('Failed to parse profile for', pubkey.slice(0, 8), ':', parseError);
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
      console.error('Failed to fetch user profiles:', error);

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
      const client = getGlobalNIP29Client();

      if (!client.isConnected()) {
        await client.connect();
      }

      const parts = targetGroupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : targetGroupId;

      console.log('👥 Fetching group members for:', localGroupId);

      // First check if current user is a member by looking for add-user events (kind 9000)
      const { useAuthStore } = await import('@/lib/stores/auth-store');
      const currentUserPubkey = useAuthStore.getState().pubkey;

      if (currentUserPubkey) {
        console.log('🔍 Checking membership status for current user...');
        try {
          const membershipEvents = await client.fetchEvents({
            kinds: [9000], // Add user events
            '#h': [localGroupId],
            '#p': [currentUserPubkey],
            limit: 10
          });

          console.log('👤 Found', membershipEvents.length, 'membership events for current user');

          if (membershipEvents.length === 0) {
            console.log('⚠️ No membership confirmation found - user might not be recognized as member yet');
            console.log('⚠️ This could explain why relay denies access to group events');
          } else {
            console.log('✅ User has membership confirmation events');
          }
        } catch (membershipError) {
          console.warn('Failed to check membership status:', membershipError);
        }
      }

      // Initialize member arrays
      let memberPubkeys: string[] = [];
      let adminPubkeys: string[] = [];

      // Fetch member list directly using NIP-29 specification
      // Kind 39002 contains the authoritative member list for authenticated users
      console.log('🔍 Fetching Kind 39002 member list for authenticated user...');

      try {
        const memberListEvents = await client.fetchEvents({
          kinds: [39002], // NIP-29 member list - the authoritative source
          '#h': [localGroupId],
          limit: 1
        });

        console.log('📋 Found', memberListEvents.length, 'Kind 39002 member list events');

        if (memberListEvents.length > 0) {
          const memberEvent = memberListEvents[0];
          console.log('✅ Successfully fetched member list event:', {
            id: memberEvent.id.slice(0, 8),
            pubkey: memberEvent.pubkey.slice(0, 8),
            tags: memberEvent.tags
          });

          // Extract all member pubkeys from p tags - KIND_39002 contains all members
          const allMemberPubkeys: string[] = [];

          memberEvent.tags.forEach(tag => {
            if (tag[0] === 'p') {
              allMemberPubkeys.push(tag[1]);
            }
          });

          console.log('👥 Extracted member pubkeys from KIND_39002:', allMemberPubkeys.map(pk => pk.slice(0, 8)));

          // Set member list
          memberPubkeys = allMemberPubkeys;

          console.log('👥 Found', memberPubkeys.length, 'total members');

        } else {
          console.log('❌ No KIND_39002 member list events found');
        }

      } catch (error) {
        console.error('❌ Failed to fetch KIND_39002 member list:', error);
      }

      // Now fetch admin list from KIND_39001 separately
      if (memberPubkeys.length > 0) {
        console.log('🔍 Fetching KIND_39001 admin list...');

        try {
          const adminListEvents = await client.fetchEvents({
            kinds: [39001], // NIP-29 admin list
            '#h': [localGroupId],
            limit: 1
          });

          if (adminListEvents.length > 0) {
            const adminEvent = adminListEvents[0];
            const adminPubkeysFromEvent: string[] = [];

            adminEvent.tags.forEach(tag => {
              if (tag[0] === 'p') {
                adminPubkeysFromEvent.push(tag[1]);
              }
            });

            adminPubkeys = adminPubkeysFromEvent;
            console.log('👑 Found', adminPubkeys.length, 'admins:', adminPubkeys.map(pk => pk.slice(0, 8)));
          } else {
            console.log('❌ No KIND_39001 admin list events found');
          }
        } catch (error) {
          console.error('❌ Failed to fetch KIND_39001 admin list:', error);
        }
      }

      console.log('👥 Final member pubkeys:', memberPubkeys.map(pk => pk.slice(0, 8)));
      console.log('👑 Final admin pubkeys:', adminPubkeys.map(pk => pk.slice(0, 8)));


      // Continue with fallback logic if KIND_39002 didn't provide members

      // Fallback to workspace data if relay doesn't provide member lists
      if (memberPubkeys.length === 0 && workspace) {
        console.log('📋 Using workspace fallback data');
        memberPubkeys = workspace.members || [];
        adminPubkeys = workspace.admins || [];
      }

      // Emergency fallback: if still no members, try to find ANY events related to this group
      if (memberPubkeys.length === 0) {
        console.log('🚨 EMERGENCY FALLBACK: No members found from any source!');
        console.log('🔍 Searching for ANY events related to group:', localGroupId);

        try {
          // Search for any events with h tag matching the group
          const anyEvents = await client.fetchEvents({
            '#h': [localGroupId],
            limit: 100
          });

          console.log('🔍 Found', anyEvents.length, 'total events with h tag:', localGroupId);

          if (anyEvents.length > 0) {
            console.log('🔍 Event breakdown by kind:');
            const eventsByKind = anyEvents.reduce((acc, event) => {
              acc[event.kind] = (acc[event.kind] || 0) + 1;
              return acc;
            }, {} as Record<number, number>);
            console.log('🔍 Events by kind:', eventsByKind);

            // Extract unique pubkeys from all these events
            const allPubkeys = [...new Set(anyEvents.map(e => e.pubkey))];
            console.log('🔍 All unique pubkeys from events:', allPubkeys.map(pk => pk.slice(0, 8)));

            if (allPubkeys.length > 0) {
              memberPubkeys = allPubkeys;
              console.log('🚨 Using emergency fallback - all pubkeys from group events');
            }
          }
        } catch (error) {
          console.error('Emergency fallback failed:', error);
        }

        // Final fallback: add current user if still nothing
        if (memberPubkeys.length === 0) {
          console.log('⚠️ Even emergency fallback failed - adding current user only');
          const { useAuthStore } = await import('@/lib/stores/auth-store');
          const currentUserPubkey = useAuthStore.getState().pubkey;
          if (currentUserPubkey) {
            console.log('🆔 Adding current user as final fallback:', currentUserPubkey.slice(0, 8));
            memberPubkeys = [currentUserPubkey];
          }
        }
      }

      console.log('👥 Found', memberPubkeys.length, 'members and', adminPubkeys.length, 'admins');

      // Combine all unique pubkeys
      const allPubkeys = [...new Set([...memberPubkeys, ...adminPubkeys])];

      if (allPubkeys.length === 0) {
        console.log('⚠️ No members found for group');
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

      console.log('✅ Successfully fetched', groupMembers.length, 'group members');
      setLastFetched(Date.now());
      return groupMembers;

    } catch (error) {
      console.error('Failed to fetch group members:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch group members');
      return [];
    }
  }, [workspace, fetchUserProfiles, generateAvatarUrl]);

  // Refresh members data
  const refreshMembers = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const freshMembers = await fetchGroupMembers(groupId);
      setMembers(freshMembers);
    } finally {
      setLoading(false);
    }
  }, [groupId, fetchGroupMembers]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !groupId) return;

    const interval = setInterval(refreshMembers, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, groupId, refreshInterval, refreshMembers]);

  // Initial fetch effect
  useEffect(() => {
    if (groupId) {
      refreshMembers();
    }
  }, [groupId, refreshMembers]);

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

  // Get members formatted for UserAvatars component
  const getAvatarUsers = useCallback(() => {
    return members.map((member, index) => ({
      id: member.pubkey,
      name: member.name,
      image: member.picture || generateAvatarUrl(member.pubkey, member.name),
      pubkey: member.pubkey,
      role: member.role,
    }));
  }, [members, generateAvatarUrl]);

  return {
    members,
    profiles,
    loading,
    error,
    lastFetched,
    refreshMembers,
    getMember,
    isAdmin,
    isMember,
    getAvatarUsers,
    // Stats
    memberCount: members.length,
    adminCount: members.filter(m => m.isAdmin).length,
    regularMemberCount: members.filter(m => !m.isAdmin).length,
  };
}