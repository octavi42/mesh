import { useChannelStore } from '@/lib/stores/channel-store';

/**
 * Bridge hook that provides channels for a workspace
 * This temporarily maps to the new channel store structure
 */
export function useChannels(workspaceId: string | null) {
  const { getChannelsForWorkspace } = useChannelStore();

  if (!workspaceId) {
    return [];
  }

  return getChannelsForWorkspace(workspaceId);
}