'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannels, syncChannelsForWorkspace } from '@/lib/hooks/use-channels';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChannelList } from '@/components/channels/ChannelList';
import { CreateChannelSheet } from '@/components/sheets/create-channel-sheet';
import { MessageSquarePlus, Hash } from 'lucide-react';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const { getWorkspaceById, clearWorkspaces, workspaces } = useWorkspaceStore();
  const { isLoadingWorkspace, reset: resetChatStore, setLoadingWorkspace, setCurrentWorkspace } = useChatStore();

  // Find workspace by either full ID or sanitized ID (URL param might be sanitized)
  const workspace = getWorkspaceById(workspaceId) ||
    workspaces.find(w => w.id.includes(`'${workspaceId}`)) ||
    null;

  // Use the actual workspace ID for channel queries and operations
  const actualWorkspaceId = workspace?.id || workspaceId;
  const channels = useChannels(actualWorkspaceId);
  const isLoading = isLoadingWorkspace; // Show loading when workspace is being set

  // Note: Removed "corrupted" workspace ID validation as NIP-29 group IDs
  // can contain dots and quotes (e.g., "groups.contextio.app'dlpnklmeoft")
  // and are valid - we should not clear workspace data for valid group IDs

  // Set current workspace from URL params and preload channels
  useEffect(() => {
    if (actualWorkspaceId) {
      console.log('🔄 Setting current workspace from URL:', workspaceId, 'actual ID:', actualWorkspaceId);
      setCurrentWorkspace(actualWorkspaceId);

      // Proactively sync channels to prevent loading delays
      syncChannelsForWorkspace(actualWorkspaceId).catch(error => {
        console.warn('Failed to preload channels:', error);
      });
    }
  }, [actualWorkspaceId, setCurrentWorkspace]);

  // Clear loading state when workspace is found
  useEffect(() => {
    if (workspace && isLoadingWorkspace) {
      console.log('🔄 Clearing workspace loading state');
      setLoadingWorkspace(false);
    }
  }, [workspace, isLoadingWorkspace, setLoadingWorkspace]);

  // Don't auto-redirect - let user choose a channel

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
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to {workspace.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Get started by creating your first channel to begin conversations with your team.
            </p>
          </div>

          <CreateChannelSheet
            workspaceId={actualWorkspaceId}
            trigger={
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                <MessageSquarePlus className="w-5 h-5" />
                Create Channel
              </button>
            }
          />

          <p className="text-sm text-gray-500 mt-4">
            Channels are where your team communicates. They can be organized by topic, project, or team.
          </p>
        </div>
      </div>
    );
  }

  // AppLayout already provides the sidebar with channels via Sidebar component
  // Just show the main empty state content
  return (
    <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <MessageSquarePlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a channel to start chatting
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a channel from the sidebar to view messages and join the conversation.
            </p>
          </div>

          <div className="space-y-3">
            {channels.length > 0 && (
              <p className="text-sm text-gray-500">
                or click on a channel like <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-600">#{channels[0].name}</span> to get started
              </p>
            )}

            <div>
              <CreateChannelSheet
                workspaceId={actualWorkspaceId}
                trigger={
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors border border-blue-200 dark:border-blue-800">
                    <MessageSquarePlus className="w-4 h-4" />
                    Create New Channel
                  </button>
                }
              />
            </div>
          </div>
        </div>
    </div>
  );
}