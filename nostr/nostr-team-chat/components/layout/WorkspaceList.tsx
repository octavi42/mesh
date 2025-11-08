'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { db, type Channel } from '@/lib/db/schema';
import { CreateWorkspaceSheet } from '@/components/sheets/create-workspace-sheet';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';

export function WorkspaceList() {
  const { currentWorkspaceId, setCurrentWorkspace, isLoadingWorkspace } = useChatStore();
  const { workspaces } = useWorkspaceStore();
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  console.log('🔍 WorkspaceList render - workspaces:', workspaces, 'currentWorkspaceId:', currentWorkspaceId);

  // Helper function to sanitize workspace ID for URL
  const sanitizeWorkspaceIdForUrl = (workspaceId: string): string => {
    // Remove domain prefix and special characters for URL-safe routing
    if (workspaceId.includes("'")) {
      // Extract the part after the single quote (e.g., "groups.contextio.app'dlpnklmeoft" -> "dlpnklmeoft")
      return workspaceId.split("'")[1] || workspaceId;
    }
    return workspaceId;
  };

  const handleWorkspaceClick = async (workspaceId: string) => {
    console.log('🖱️ Workspace clicked:', workspaceId);

    // Prevent clicking on the same workspace
    if (currentWorkspaceId === workspaceId) {
      console.log('⏭️ Already in workspace, ignoring click:', workspaceId);
      return;
    }

    // Prevent rapid successive clicks
    if (isNavigatingRef.current) {
      console.log('⚠️ Click ignored - already navigating');
      return;
    }

    isNavigatingRef.current = true;

    try {
      // Use sanitized workspace ID for URL but keep original for internal tracking
      const urlSafeWorkspaceId = sanitizeWorkspaceIdForUrl(workspaceId);
      console.log('🔍 Looking for channels in workspace:', workspaceId, 'URL-safe ID:', urlSafeWorkspaceId);

      let channels = await db.channels.where('workspaceId').equals(workspaceId).toArray();
      console.log('📋 Found channels:', channels);

      // If no channels exist, create default channels for the workspace
      if (channels.length === 0) {
        console.log('📋 No channels found, creating default channels for workspace:', workspaceId);

        const now = Date.now();
        const defaultChannels: Channel[] = [
          {
            id: `${workspaceId}-general`,
            workspaceId,
            name: 'general',
            description: 'General discussion',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `${workspaceId}-random`,
            workspaceId,
            name: 'random',
            description: 'Random conversations',
            createdAt: now,
            updatedAt: now,
          }
        ];

        try {
          await db.channels.bulkAdd(defaultChannels);
          console.log('✅ Created default channels:', defaultChannels.map(c => c.name));
          channels = defaultChannels;
        } catch (error) {
          console.error('❌ Failed to create default channels:', error);
          // Continue anyway, we can navigate to workspace without channels
        }
      }

      const firstChannel = channels[0];

      if (firstChannel) {
        console.log('🔄 Setting workspace with first channel:', workspaceId, firstChannel.id);

        // Set workspace immediately for responsive UI (use original ID)
        setCurrentWorkspace(workspaceId, firstChannel.id);

        // Navigate using Next.js router with URL-safe IDs
        const url = `/app/w/${encodeURIComponent(urlSafeWorkspaceId)}/c/${encodeURIComponent(firstChannel.id)}`;
        console.log('🚀 Navigating to:', url);
        router.push(url);
      } else {
        console.log('🔄 Setting workspace without channel:', workspaceId);

        // Set workspace immediately for responsive UI (use original ID)
        setCurrentWorkspace(workspaceId);

        // Navigate using Next.js router with URL-safe ID
        const url = `/app/w/${encodeURIComponent(urlSafeWorkspaceId)}`;
        console.log('🚀 Navigating to:', url);
        router.push(url);
      }
    } catch (error) {
      console.error('Failed to handle workspace click:', error);
    } finally {
      // Reset navigation flag immediately after operation
      isNavigatingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Create New Group Button */}
      <div className="flex-shrink-0 flex justify-center pt-4 pb-0">
        <CreateWorkspaceSheet
          trigger={
            <button
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-indigo-500 hover:text-indigo-500 dark:border-gray-700 dark:hover:border-indigo-500"
              aria-label="Add workspace"
              title="Add workspace"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
            </button>
          }
        />
      </div>

      {/* Scrollable Workspaces List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-2 pt-4 pb-4">
          {workspaces.map((workspace) => {
            const isActive = currentWorkspaceId === workspace.id;
            const isLoading = isLoadingWorkspace && isActive;

            return (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceClick(workspace.id)}
                disabled={isLoading || isActive}
                className={`
                  flex h-12 w-12 items-center justify-center rounded-xl text-2xl
                  transition-all duration-200 relative
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg scale-110 cursor-default'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer'
                  }
                  ${isLoading ? 'opacity-75' : ''}
                  ${isActive ? 'pointer-events-none' : ''}
                `}
                aria-label={workspace.name}
                title={isActive ? `Current workspace: ${workspace.name}` : workspace.name}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : workspace.picture ? (
                  <img src={workspace.picture} alt={workspace.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  workspace.name[0]?.toUpperCase() || '?'
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
