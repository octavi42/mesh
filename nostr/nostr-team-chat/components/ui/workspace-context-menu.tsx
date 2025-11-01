'use client';

import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Settings, LogOut, Users, Hash, Trash2 } from 'lucide-react';
import { WorkspaceSettingsSheet } from '@/components/sheets/workspace-settings-sheet';
import { useDeletePermissions } from '@/lib/hooks/use-delete-permissions';

interface WorkspaceContextMenuProps {
  children: React.ReactNode;
  groupId: string;
  workspaceName: string;
}

export function WorkspaceContextMenu({
  children,
  groupId,
  workspaceName,
}: WorkspaceContextMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { canDeleteGroup } = useDeletePermissions({ groupId });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Workspace Settings
          </ContextMenuItem>

          <ContextMenuItem className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Members
          </ContextMenuItem>

          <ContextMenuItem className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Create Channel
          </ContextMenuItem>

          <ContextMenuItem className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Leave Workspace
          </ContextMenuItem>

          {canDeleteGroup && (
            <ContextMenuItem
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete Workspace
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <WorkspaceSettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        groupId={groupId}
      />
    </>
  );
}