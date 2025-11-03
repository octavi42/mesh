'use client';

import Link from 'next/link';
import type { Workspace } from '@/lib/stores/workspace-store-clean';

interface WorkspaceListProps {
  workspaces: Workspace[];
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Workspaces
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Select a workspace to start collaborating
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={`/app/w/${workspace.id}`}
            className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
          >
            <div className="flex items-start space-x-3">
              {workspace.picture ? (
                <img
                  src={workspace.picture}
                  alt={workspace.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                    {workspace.description}
                  </p>
                )}
                <div className="flex items-center mt-2 space-x-2 flex-wrap">
                  {workspace.isPublic ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      Private
                    </span>
                  )}
                  {workspace.isClosed && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      Closed
                    </span>
                  )}
                  {workspace.isBroadcast && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Broadcast
                    </span>
                  )}
                  {workspace.relay && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {workspace.relay.replace('wss://', '').replace('ws://', '')}
                    </span>
                  )}
                  {workspace.memberCount !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {workspace.memberCount} members
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}