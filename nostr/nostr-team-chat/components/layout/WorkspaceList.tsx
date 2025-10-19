'use client';

import { useRef } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { db } from '@/lib/db/schema';
import { CreateWorkspaceSheet } from '@/components/sheets/create-workspace-sheet';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

export function WorkspaceList() {
  const { currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const { workspaces } = useWorkspaceStore();
  const isNavigatingRef = useRef(false);

  console.log('🔍 WorkspaceList render - workspaces:', workspaces, 'currentWorkspaceId:', currentWorkspaceId);

  const handleWorkspaceClick = async (workspaceId: string) => {
    console.log('🖱️ Workspace clicked:', workspaceId);
    if (isNavigatingRef.current) {
      console.log('⚠️ Click ignored - already navigating');
      return;
    }

    isNavigatingRef.current = true;

    try {
      const channels = await db.channels.where('workspaceId').equals(workspaceId).toArray();
      const firstChannel = channels[0];

      if (firstChannel) {
        setCurrentWorkspace(workspaceId, firstChannel.id);

        if (typeof window !== 'undefined') {
          const url = `/app/w/${workspaceId}/c/${firstChannel.id}`;
          window.history.pushState({}, '', url);
        }
      } else {
        setCurrentWorkspace(workspaceId);

        if (typeof window !== 'undefined') {
          const url = `/app/w/${workspaceId}`;
          window.history.pushState({}, '', url);
        }
      }
    } catch (error) {
      console.error('Failed to handle workspace click:', error);
    } finally {
      requestAnimationFrame(() => {
        isNavigatingRef.current = false;
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {workspaces.map((workspace) => {
        const isActive = currentWorkspaceId === workspace.groupId;

        return (
          <button
            key={workspace.groupId}
            onMouseDown={() => handleWorkspaceClick(workspace.groupId)}
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl text-2xl
              transition-all duration-200
              ${isActive
                ? 'bg-indigo-600 text-white shadow-lg scale-110'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
            aria-label={workspace.name}
            title={workspace.name}
          >
            {workspace.picture ? (
              <img src={workspace.picture} alt={workspace.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              workspace.name[0]?.toUpperCase() || '?'
            )}
          </button>
        );
      })}

      <div className="my-2 h-px w-10 bg-gray-300 dark:bg-gray-700" />

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
  );
}
