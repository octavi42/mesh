'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
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
    <Sheet.Root id="create-workspace-sheet">
      {trigger && <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>}
      <Sheet.View contentPlacement="bottom" detached={true} style={{ zIndex: 9999 }}>
        <div className="create-workspace-sheet-content">
          <div className="create-workspace-sheet-header">
            <h2 className="create-workspace-sheet-title">Create Workspace</h2>
            <p className="create-workspace-sheet-description">
              Set up a new workspace for your team
            </p>
          </div>

          <div className="create-workspace-sheet-form">
            <div className="form-group">
              <label htmlFor="workspace-name" className="form-label">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Awesome Team"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="workspace-icon" className="form-label">
                Icon (emoji)
              </label>
              <input
                id="workspace-icon"
                type="text"
                value={workspaceIcon}
                onChange={(e) => setWorkspaceIcon(e.target.value)}
                placeholder="🚀"
                className="form-input"
                maxLength={2}
              />
            </div>

            <Sheet.Close asChild>
              <button
                onClick={handleCreate}
                className="create-button"
                disabled={!workspaceName}
              >
                Create Workspace
              </button>
            </Sheet.Close>
          </div>
        </div>
      </Sheet.View>
    </Sheet.Root>
  );
}
