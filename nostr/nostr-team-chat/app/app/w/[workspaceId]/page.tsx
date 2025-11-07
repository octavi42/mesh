'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannels, syncChannelsForWorkspace } from '@/lib/hooks/use-channels';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChannelList } from '@/components/channels/ChannelList';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const channels = useChannels(workspaceId);
  const { setCurrentWorkspace, getWorkspaceById, clearWorkspaces } = useWorkspaceStore();
  const { isLoadingWorkspace, reset: resetChatStore } = useChatStore();
  const workspace = getWorkspaceById(workspaceId);
  const isLoading = isLoadingWorkspace; // Show loading when workspace is being set

  // Note: Removed "corrupted" workspace ID validation as NIP-29 group IDs
  // can contain dots and quotes (e.g., "groups.contextio.app'dlpnklmeoft")
  // and are valid - we should not clear workspace data for valid group IDs

  // Set current workspace from URL params and preload channels
  useEffect(() => {
    if (workspaceId) {
      console.log('🔄 Setting current workspace from URL:', workspaceId);
      setCurrentWorkspace(workspaceId);

      // Proactively sync channels to prevent loading delays
      syncChannelsForWorkspace(workspaceId).catch(error => {
        console.warn('Failed to preload channels:', error);
      });
    }
  }, [workspaceId, setCurrentWorkspace]);

  // Auto-redirect to first channel if available (only if not coming from specific navigation)
  useEffect(() => {
    if (!isLoading && channels.length > 0) {
      const firstChannel = channels[0];
      console.log('🔄 Auto-redirecting to first channel:', firstChannel.id);
      router.replace(`/app/w/${workspaceId}/c/${firstChannel.id}`);
    }
  }, [channels, isLoading, workspaceId, router]);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Workspace Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The workspace "{workspaceId}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading channels...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            No Channels Yet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This workspace doesn't have any channels yet.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                // TODO: Implement create channel functionality
                console.log('🔧 Create channel button clicked');
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Create Channel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {workspace.name}
        </h1>
        {workspace.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {workspace.description}
          </p>
        )}
      </div>
      <ChannelList channels={channels} workspaceId={workspaceId} />
    </div>
  );
}