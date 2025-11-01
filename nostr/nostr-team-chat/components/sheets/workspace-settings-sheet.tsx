'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2, Settings, Users, Hash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeletePermissions } from '@/lib/hooks/use-delete-permissions';
import { useDeleteActions } from '@/lib/hooks/use-delete-actions';
import { useNIP29Workspace } from '@/lib/hooks/use-nip29-workspace';
import { Badge } from '@/components/ui/badge';

interface WorkspaceSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function WorkspaceSettingsSheet({
  isOpen,
  onClose,
  groupId,
}: WorkspaceSettingsSheetProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { workspace } = useNIP29Workspace(groupId);
  const { canDeleteGroup } = useDeletePermissions({ groupId });
  const { deleteGroup, isDeleting } = useDeleteActions(groupId);

  const handleDeleteWorkspace = async () => {
    try {
      await deleteGroup();
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  if (!workspace) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workspace Settings
          </SheetTitle>
          <SheetDescription>
            Manage your workspace settings and preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={workspace.name}
                disabled
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact an admin to change the workspace name
              </p>
            </div>

            <div>
              <Label htmlFor="workspace-description">Description</Label>
              <Input
                id="workspace-description"
                value={workspace.description || 'No description'}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="workspace-id">Workspace ID</Label>
              <Input
                id="workspace-id"
                value={groupId}
                disabled
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          {/* Workspace Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Workspace Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Members</p>
                  <p className="text-sm font-medium">{workspace.members.length + workspace.admins.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <div className="flex gap-1">
                    <Badge variant={workspace.isPublic ? 'default' : 'secondary'} className="text-xs">
                      {workspace.isPublic ? 'Public' : 'Private'}
                    </Badge>
                    <Badge variant={workspace.isOpen ? 'default' : 'secondary'} className="text-xs">
                      {workspace.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Admin Actions */}
          {canDeleteGroup && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                Danger Zone
              </h3>
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-950/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Delete Workspace
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      This action cannot be undone. All messages, channels, and data will be permanently deleted.
                    </p>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="mt-3"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you absolutely sure you want to delete &quot;{workspace.name}&quot;?
                            This action cannot be undone and will permanently delete:
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li>• All messages and chat history</li>
                            <li>• All channels and their content</li>
                            <li>• Member list and permissions</li>
                            <li>• Invites and join requests</li>
                          </ul>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteWorkspace}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}