'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Search, UserPlus, Shield } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { UserInfoSheet } from './user-info-sheet';
import { InviteUserSheet } from './invite-user-sheet';
import './all-users-sheet.css';

interface User {
  id: string | number;
  name?: string;
  image: string;
  pubkey?: string;
  role?: string;
  isAdmin?: boolean; // Whether this user is an admin
}

interface AllUsersSheetProps {
  users: User[];
  trigger: React.ReactNode;
  isAdmin?: boolean; // Whether the current user (viewer) is an admin
  currentUserPubkey?: string; // The current logged-in user's pubkey
  onKickUser?: (userPubkey: string) => Promise<void>; // Handler to kick a user
}

export function AllUsersSheet({ 
  users, 
  trigger, 
  isAdmin = false, 
  currentUserPubkey,
  onKickUser 
}: AllUsersSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteClick = () => {
    setTimeout(() => {
      setShowInviteSheet(true);
      setTimeout(() => {
        inviteButtonRef.current?.click();
      }, 50);
    }, 300);
  };

  const handleDismissAll = () => {
    dismissButtonRef.current?.click();
  };

  return (
    <>
      <Sheet.Root license="commercial">
        <Sheet.Trigger asChild>
          {trigger}
        </Sheet.Trigger>
        <Sheet.Portal>
          <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true} style={{ zIndex: 9999 }}>
            <Sheet.Backdrop
              travelAnimation={{
                opacity: "1",
                backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
                backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
              }}
            />
            <Sheet.Content
              className="AllUsersSheet-content"
              stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            >
              <div className="AllUsersSheet-innerContent">
                <Sheet.Trigger action="dismiss" asChild>
                  <button ref={dismissButtonRef} style={{ display: 'none' }} />
                </Sheet.Trigger>
                <div className="p-8 shrink-0">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Members</h2>
                    <div className="flex items-center gap-2">
                      <Sheet.Trigger action="dismiss" asChild>
                        <button
                          onClick={handleInviteClick}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </button>
                      </Sheet.Trigger>
                      <Sheet.Trigger action="dismiss" asChild>
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </Sheet.Trigger>
                    </div>
                  </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <UserInfoSheet
                      key={user.id}
                      user={user}
                      isAdmin={isAdmin}
                      isCurrentUser={currentUserPubkey ? user.pubkey === currentUserPubkey : false}
                      onDismissParent={handleDismissAll}
                      onKickUser={onKickUser}
                      trigger={
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                            <img
                              src={user.image}
                              alt={user.name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || 'Anonymous'}</p>
                              {user.isAdmin && (
                                <span title="Admin">
                                  <Shield className="w-3 h-3 text-blue-500" />
                                </span>
                              )}
                            </div>
                            {user.pubkey && (
                              <p className="text-xs text-gray-500 truncate font-mono">{user.pubkey.slice(0, 16)}...</p>
                            )}
                          </div>
                        </div>
                      }
                    />
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No members found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
      </Sheet.Root>

      {showInviteSheet && (
        <InviteUserSheet
          trigger={
            <button
              ref={inviteButtonRef}
              style={{ display: 'none' }}
            />
          }
        />
      )}
    </>
  );
}
