'use client';

import { useState, useCallback } from 'react';
import { removeUserEvent } from '@/lib/nostr/nip29/events';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useAuthStore } from '@/lib/stores/auth-store';

interface UseMemberActionsOptions {
  groupId: string;
  onUserKicked?: (userPubkey: string) => void;
}

export function useMemberActions({ groupId, onUserKicked }: UseMemberActionsOptions) {
  const [isKicking, setIsKicking] = useState(false);
  const { pubkey: currentUserPubkey } = useAuthStore();
  
  // Get workspace directly from the clean store (which has the actual data)
  const workspaces = useWorkspaceStore(state => state.workspaces);
  const workspace = workspaces.find(w => w.id === groupId);
  
  const admins = workspace?.admins || [];
  const checkIsAdmin = (pubkey: string) => admins.includes(pubkey);

  // Check if current user is admin
  const isCurrentUserAdmin = currentUserPubkey && groupId ? checkIsAdmin(currentUserPubkey) : false;

  // Debug log admin status
  console.log('🔍 useMemberActions admin check:', {
    groupId,
    currentUserPubkey: currentUserPubkey?.slice(0, 8),
    isCurrentUserAdmin,
    workspaceFound: !!workspace,
    workspaceName: workspace?.name,
    totalWorkspaces: workspaces.length,
    allWorkspaceIds: workspaces.map(w => w.id),
    admins: admins?.map(a => a.slice(0, 8)),
    checkResult: currentUserPubkey ? checkIsAdmin(currentUserPubkey) : 'no pubkey'
  });

  /**
   * Kick a user from the workspace
   * Only admins can kick non-admin users
   */
  const kickUser = useCallback(async (userPubkey: string): Promise<void> => {
    if (isKicking) {
      console.log('Already processing a kick request');
      return;
    }

    if (!groupId) {
      toast.error('No workspace selected');
      throw new Error('No workspace selected');
    }

    if (!currentUserPubkey) {
      toast.error('You must be logged in to kick users');
      throw new Error('Not authenticated');
    }

    if (!isCurrentUserAdmin) {
      toast.error('Only admins can kick users');
      throw new Error('Not authorized');
    }

    if (userPubkey === currentUserPubkey) {
      toast.error('You cannot kick yourself');
      throw new Error('Cannot kick yourself');
    }

    // Check if target is an admin
    if (checkIsAdmin(userPubkey)) {
      toast.error('Cannot kick an admin');
      throw new Error('Cannot kick an admin');
    }

    setIsKicking(true);
    const toastId = `kick-user-${userPubkey.slice(0, 8)}`;

    try {
      console.log('🦵 Starting kick user process for:', userPubkey.slice(0, 8));
      toast.loading('Removing user from workspace...', { id: toastId });

      // Extract local group ID for relay operations (remove relay prefix if present)
      const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : groupId;

      // Create the remove user event (kind 9001)
      const event = await removeUserEvent(localGroupId, userPubkey);

      console.log('🦵 Created remove user event:', {
        kind: event.kind,
        tags: event.tags,
        groupId: localGroupId,
        targetUser: userPubkey.slice(0, 8),
      });

      // Send via the authenticated NIP-29 client
      const client = getGlobalNIP29Client();
      await client.publishEvent(event);

      console.log('✅ User kicked successfully:', userPubkey.slice(0, 8));
      toast.success('User has been removed from the workspace', { id: toastId });

      // Emit event to trigger member list refresh for the kicker's UI
      const refreshEvent = new CustomEvent('member-list-changed', {
        detail: { groupId, action: 'removed', userPubkey }
      });
      window.dispatchEvent(refreshEvent);

      // Call the optional callback
      if (onUserKicked) {
        onUserKicked(userPubkey);
      }
    } catch (error) {
      console.error('❌ Failed to kick user:', error);
      toast.error(`Failed to remove user: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      throw error;
    } finally {
      setIsKicking(false);
    }
  }, [isKicking, currentUserPubkey, isCurrentUserAdmin, checkIsAdmin, groupId, onUserKicked]);

  return {
    kickUser,
    isKicking,
    isCurrentUserAdmin,
    currentUserPubkey,
  };
}
