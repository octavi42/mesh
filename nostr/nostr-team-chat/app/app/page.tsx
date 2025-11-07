'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';
import { WorkspaceSelectionList } from '@/components/workspaces/WorkspaceSelectionList';

// Right side welcome message
function WelcomePanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">N</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Select or create a workspace
        </h1>

        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Choose a workspace from the list to start collaborating with your team,
          or create a new one to get started.
        </p>
      </div>
    </div>
  );
}

// Empty state when no workspaces
function EmptyPanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">N</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Nostr Team Chat
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Create your first workspace to get started with decentralized team collaboration.
        </p>

        <CreateWorkspaceModal />
      </div>
    </div>
  );
}

export default function AppHomePage() {
  const { workspaces, isLoading } = useWorkspaceStore();

  // Custom layout: Left sidebar with full workspace names + Right panel with welcome message
  return (
    <div className="h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex">
      {/* Left Sidebar - Workspace Selection List */}
      <div className="w-80 flex-shrink-0">
        <WorkspaceSelectionList isLoading={isLoading} />
      </div>

      {/* Right Panel - Welcome Message */}
      <div className="flex-1">
        {workspaces.length === 0 && !isLoading ? (
          <EmptyPanel />
        ) : (
          <WelcomePanel />
        )}
      </div>
    </div>
  );
}