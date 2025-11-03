'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { WorkspaceList } from '@/components/workspaces/WorkspaceList';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';

export default function AppHomePage() {
  const router = useRouter();
  const { workspaces, isLoading } = useWorkspaceStore();

  // Auto-redirect to first workspace if available
  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      const firstWorkspace = workspaces[0];
      console.log('🔄 Auto-redirecting to first workspace:', firstWorkspace.id);
      router.replace(`/app/w/${firstWorkspace.id}`);
    }
  }, [workspaces, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Nostr Team Chat
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create or join a workspace to get started with decentralized collaboration
          </p>
        </div>
        <CreateWorkspaceModal />
      </div>
    );
  }

  return <WorkspaceList workspaces={workspaces} />;
}