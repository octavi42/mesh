'use client';

import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useAppInitialization } from '@/lib/hooks/use-app-initialization-clean';
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
          <span className="text-white font-bold text-2xl">M</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Mesh
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
  const { isInitialized, isInitializing, error } = useAppInitialization();
  const [showSkipOption, setShowSkipOption] = useState(false);

  // Show skip option after 10 seconds of initialization
  useEffect(() => {
    if (isInitializing) {
      const timer = setTimeout(() => {
        setShowSkipOption(true);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setShowSkipOption(false);
    }
  }, [isInitializing]);

  // Show initialization state
  if (isInitializing) {
    return (
      <div className="h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Initializing...
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Setting up your Nostr connection
          </p>

          {showSkipOption && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Taking longer than usual? You can continue anyway.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 mr-2"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  // Force skip initialization by navigating to a specific workspace
                  const firstWorkspace = workspaces[0];
                  if (firstWorkspace) {
                    window.location.href = `/app/w/${firstWorkspace.id}`;
                  } else {
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Continue Anyway
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show initialization error
  if (error) {
    return (
      <div className="h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Initialization Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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