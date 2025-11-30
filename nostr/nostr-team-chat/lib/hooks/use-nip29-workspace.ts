import { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useNDK } from '@/lib/hooks/use-ndk';
import type { NIP29Workspace } from '@/lib/db/schema';

export function useNIP29Workspace(groupId?: string) {
  const {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    initializeClient,
    fetchWorkspaces,
    syncWorkspace,
    subscribeToWorkspace,
    setCurrentWorkspace,
  } = useWorkspaceStore();

  // Use NDK context to check if NDK is ready with signer
  const { ndk, hasSigner, isConnected } = useNDK();
  
  const [initialized, setInitialized] = useState(false);
  const initializingRef = useRef(false);

  // Only initialize when NDK is ready with signer and connected
  useEffect(() => {
    const shouldInitialize = ndk && hasSigner && isConnected && !initialized && !initializingRef.current;
    
    if (shouldInitialize) {
      console.log('🔧 useNIP29Workspace: NDK ready, initializing workspace client...');
      initializingRef.current = true;
      
      initializeClient()
        .then(() => {
          console.log('✅ useNIP29Workspace: Workspace client initialized');
          setInitialized(true);
        })
        .catch((err) => {
          console.error('❌ useNIP29Workspace: Failed to initialize workspace client:', err);
          initializingRef.current = false; // Allow retry
        });
    }
  }, [ndk, hasSigner, isConnected, initialized, initializeClient]);

  // Sync workspace when initialized and groupId is provided
  useEffect(() => {
    if (initialized && groupId && !workspaces.find((w) => w.groupId === groupId)) {
      syncWorkspace(groupId).then(() => {
        subscribeToWorkspace(groupId);
      });
    }
  }, [initialized, groupId, workspaces, syncWorkspace, subscribeToWorkspace]);

  const workspace = groupId
    ? workspaces.find((w) => w.groupId === groupId)
    : currentWorkspace;

  return {
    workspace,
    workspaces,
    isLoading,
    error,
    initialized,
    setCurrentWorkspace,
    syncWorkspace,
  };
}

export function useWorkspaceMembers(groupId?: string) {
  const { workspace, workspaces } = useNIP29Workspace(groupId);

  // Debug log to understand what's happening
  console.log('🔍 useWorkspaceMembers debug:', {
    requestedGroupId: groupId,
    workspaceFound: !!workspace,
    workspaceGroupId: workspace?.groupId,
    workspaceAdmins: workspace?.admins,
    workspaceMembers: workspace?.members,
    totalWorkspaces: workspaces.length,
    allWorkspaceIds: workspaces.map(w => w.groupId)
  });

  return {
    members: workspace?.members || [],
    admins: workspace?.admins || [],
    isAdmin: (pubkey: string) => workspace?.admins?.includes(pubkey) || false,
    isMember: (pubkey: string) =>
      workspace?.members?.includes(pubkey) ||
      workspace?.admins?.includes(pubkey) ||
      false,
  };
}
