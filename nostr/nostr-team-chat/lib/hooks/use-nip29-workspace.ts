import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
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

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initializeClient().then(() => {
        setInitialized(true);
      });
    }
  }, [initialized, initializeClient]);

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
  const { workspace } = useNIP29Workspace(groupId);

  return {
    members: workspace?.members || [],
    admins: workspace?.admins || [],
    isAdmin: (pubkey: string) => workspace?.admins.includes(pubkey) || false,
    isMember: (pubkey: string) =>
      workspace?.members.includes(pubkey) ||
      workspace?.admins.includes(pubkey) ||
      false,
  };
}
