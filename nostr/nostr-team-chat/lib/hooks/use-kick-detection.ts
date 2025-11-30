'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useChatStore } from '@/lib/stores/chat-store';
import { db, Channel } from '@/lib/db/schema';

/**
 * Hook to detect when the current user is kicked from a workspace
 * and handle navigation away from that workspace
 */
export function useKickDetection() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaces, removeWorkspace } = useWorkspaceStore();
  const { setCurrentWorkspace, setCurrentChannel } = useChatStore();

  const handleKicked = useCallback(async (event: CustomEvent<{ groupId: string; userPubkey: string }>) => {
    const { groupId, userPubkey } = event.detail;
    console.log('🚨 Kick detection triggered:', { groupId, userPubkey: userPubkey.slice(0, 8) });

    // Get the workspace name for the toast
    const kickedWorkspace = workspaces.find(ws => ws.id === groupId);
    const workspaceName = kickedWorkspace?.name || 'the workspace';

    // Check if user is currently viewing the workspace they were kicked from
    const isViewingKickedWorkspace = pathname?.includes(`/w/${groupId}`);
    
    console.log('🚨 Kick detection state:', {
      groupId,
      isViewingKickedWorkspace,
      pathname,
      workspaceName
    });

    // Show toast notification
    toast.error(`You have been removed from "${workspaceName}"`, {
      duration: 5000,
      id: `kicked-${groupId}` // Prevent duplicate toasts
    });

    // Remove workspace from local store
    removeWorkspace(groupId);

    // Clean up local data for this workspace
    try {
      // Delete channels and messages for this workspace
      const channels = await db.channels.where('workspaceId').equals(groupId).toArray();
      for (const channel of channels) {
        await db.messages.where('channelId').equals(channel.id).delete();
      }
      await db.channels.where('workspaceId').equals(groupId).delete();
      console.log('🗑️ Cleaned up local data for kicked workspace:', groupId);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up local workspace data:', cleanupError);
    }

    // If viewing the kicked workspace, navigate away
    if (isViewingKickedWorkspace) {
      console.log('🧭 Navigating away from kicked workspace...');
      
      // Get available workspaces (excluding the kicked one)
      const availableWorkspaces = workspaces.filter(ws => ws.id !== groupId);

      if (availableWorkspaces.length > 0) {
        const nextWorkspace = availableWorkspaces[0];
        console.log('🧭 Navigating to next workspace:', nextWorkspace.name);

        try {
          // Try to find a default channel for the next workspace
          const channels = await db.channels.where('workspaceId').equals(nextWorkspace.id).toArray();

          if (channels.length > 0) {
            const defaultChannel = channels.find((c: Channel) => c.name === 'general') || channels[0];
            setCurrentWorkspace(nextWorkspace.id, defaultChannel.id);
            setCurrentChannel(defaultChannel.id);
            router.push(`/app/w/${nextWorkspace.id}/c/${defaultChannel.id}`);
          } else {
            setCurrentWorkspace(nextWorkspace.id);
            router.push(`/app/w/${nextWorkspace.id}`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to navigate with channel, going to workspace:', error);
          setCurrentWorkspace(nextWorkspace.id);
          router.push(`/app/w/${nextWorkspace.id}`);
        }
      } else {
        // No other workspaces available, go to main app page
        console.log('🧭 No other workspaces available, navigating to /app');
        router.push('/app');
      }
    }
  }, [pathname, workspaces, removeWorkspace, router, setCurrentWorkspace, setCurrentChannel]);

  useEffect(() => {
    // Listen for the kicked event
    const handler = (event: Event) => {
      handleKicked(event as CustomEvent<{ groupId: string; userPubkey: string }>);
    };
    window.addEventListener('user-kicked-from-workspace', handler);

    return () => {
      window.removeEventListener('user-kicked-from-workspace', handler);
    };
  }, [handleKicked]);
}
