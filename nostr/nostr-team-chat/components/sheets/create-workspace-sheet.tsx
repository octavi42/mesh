'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X } from 'lucide-react';
import './create-workspace-sheet.css';

interface CreateWorkspaceSheetProps {
  trigger?: React.ReactNode;
}

export function CreateWorkspaceSheet({ trigger }: CreateWorkspaceSheetProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('');

  const handleCreate = () => {
    console.log('Creating workspace:', { workspaceName, workspaceIcon });
  };

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View className="z-[100]" contentPlacement="center" nativeEdgeSwipePrevention={true} tracks={["top", "bottom"]}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 24}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white rounded-3xl shadow-2xl w-full overflow-y-auto my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{ maxWidth: '540px', height: 'auto' }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light text-slate-900">Create Workspace</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Set up a new workspace for your team
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="workspace-name" className="text-sm font-medium text-slate-700">
                    Workspace Name
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Awesome Team"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="workspace-icon" className="text-sm font-medium text-slate-700">
                    Icon (emoji)
                  </label>
                  <input
                    id="workspace-icon"
                    type="text"
                    value={workspaceIcon}
                    onChange={(e) => setWorkspaceIcon(e.target.value)}
                    placeholder="🚀"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900"
                    maxLength={2}
                  />
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm mt-2"
                  disabled={!workspaceName}
                >
                  Create Workspace
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
