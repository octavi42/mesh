'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useChatStore } from '@/lib/stores/chat-store';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';
import { db, type Channel } from '@/lib/db/schema';

interface WorkspaceSelectionListProps {
  isLoading?: boolean;
}

export function WorkspaceSelectionList({ isLoading = false }: WorkspaceSelectionListProps) {
  const router = useRouter();
  const { workspaces } = useWorkspaceStore();
  const { setCurrentWorkspace } = useChatStore();
  const isNavigatingRef = useRef(false);

  // Helper function to sanitize workspace ID for URL
  const sanitizeWorkspaceIdForUrl = (workspaceId: string): string => {
    if (workspaceId.includes("'")) {
      return workspaceId.split("'")[1] || workspaceId;
    }
    return workspaceId;
  };

  const handleWorkspaceClick = async (workspaceId: string) => {
    console.log('🖱️ Workspace clicked:', workspaceId);

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

        // Navigate directly to first channel using Next.js router with URL-safe IDs
        const url = `/app/w/${encodeURIComponent(urlSafeWorkspaceId)}/c/${encodeURIComponent(firstChannel.id)}`;
        console.log('🚀 Navigating directly to channel:', url);
        router.push(url);
      } else {
        console.log('🔄 Setting workspace without channel:', workspaceId);

        // Set workspace immediately for responsive UI (use original ID)
        setCurrentWorkspace(workspaceId);

        // Navigate using Next.js router with URL-safe ID
        const url = `/app/w/${encodeURIComponent(urlSafeWorkspaceId)}`;
        console.log('🚀 Navigating to workspace:', url);
        router.push(url);
      }
    } catch (error) {
      console.error('Failed to handle workspace click:', error);
    } finally {
      // Reset navigation flag immediately after operation
      isNavigatingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Workspaces
          </h2>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-4 rounded-xl animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Workspaces
        </h2>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => handleWorkspaceClick(workspace.id)}
              className="w-full flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left group"
            >
              {/* Workspace Avatar */}
              <div className="flex-shrink-0">
                {workspace.picture ? (
                  <img
                    src={workspace.picture}
                    alt={workspace.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {workspace.name?.[0]?.toUpperCase() || 'W'}
                    </span>
                  </div>
                )}
              </div>

              {/* Workspace Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {workspace.name || 'Unnamed Workspace'}
                </div>
                {workspace.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {workspace.description}
                  </div>
                )}
              </div>

              {/* Arrow Icon */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Create Workspace Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <CreateWorkspaceModal />
      </div>
    </div>
  );
}