'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { InviteUserSheet } from './invite-user-sheet';
import './create-workspace-sheet.css';

interface User {
  id: string;
  name: string;
  pubkey: string;
}

interface CreateWorkspaceSheetProps {
  trigger?: React.ReactNode;
}

export function CreateWorkspaceSheet({ trigger }: CreateWorkspaceSheetProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);

  const handleCreate = () => {
    console.log('Creating workspace:', { workspaceName, workspaceIcon, invitedUsers });
  };

  const handleRemoveUser = (userId: string) => {
    setInvitedUsers(invitedUsers.filter(u => u.id !== userId));
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
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between w-full mb-2 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  >
                    <label className="text-sm font-medium text-slate-700 cursor-pointer">
                      Invite Members
                    </label>
                    <div className="flex items-center gap-2">
                      {invitedUsers.length > 0 && (
                        <span className="text-xs text-slate-500">
                          {invitedUsers.length} {invitedUsers.length === 1 ? 'member' : 'members'}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded && invitedUsers.length > 0 ? '160px' : '0px',
                      opacity: isExpanded && invitedUsers.length > 0 ? 1 : 0,
                    }}
                  >
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {invitedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate font-mono">{user.pubkey.slice(0, 20)}...</p>
                          </div>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="ml-2 flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200 transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <InviteUserSheet
                    trigger={
                      <button
                        type="button"
                        className="w-full px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-slate-600 hover:text-blue-600 flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                      </button>
                    }
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
