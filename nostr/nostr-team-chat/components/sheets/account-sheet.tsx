'use client';

import { useState, useRef } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, User, Key, LogOut, Bell, UserX, Shield } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { NotificationsSheet } from './notifications-sheet';
import { PublicKeySheet } from './public-key-sheet';
import './account-sheet.css';

interface AccountSheetProps {
  trigger?: React.ReactNode;
  user?: {
    id?: number;
    name: string;
    image: string;
    pubkey: string;
    createdAt?: Date;
  };
  isCurrentUser?: boolean;
}

export function AccountSheet({ trigger, user, isCurrentUser = !user }: AccountSheetProps) {
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [showPublicKeySheet, setShowPublicKeySheet] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const publicKeyButtonRef = useRef<HTMLButtonElement>(null);
  const accountSheetRef = useRef<HTMLButtonElement>(null);

  const displayUser = user || {
    name: 'You',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser',
    pubkey: 'npub1currentuser1234567890abcdefghijklmnopqrstuvwxyz',
    createdAt: new Date('2024-01-15')
  };

  const handleSignOut = () => {
    console.log('Sign out clicked');
  };

  const handleNotificationsClick = () => {
    setShowNotificationsSheet(true);
    setTimeout(() => {
      notificationsButtonRef.current?.click();
    }, 50);
  };

  const handleKickUser = () => {
    console.log('Kick user:', displayUser.name);
  };

  const handleMakeAdmin = () => {
    console.log('Make admin:', displayUser.name);
  };

  const handleViewProfile = () => {
    console.log('View profile:', displayUser.name);
  };

  const handlePublicKeyClick = () => {
    accountSheetRef.current?.click();
    setShowPublicKeySheet(true);
    setTimeout(() => {
      publicKeyButtonRef.current?.click();
    }, 50);
  };

  const defaultTrigger = (
    <button className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 hover:border-indigo-600 transition-colors flex-shrink-0">
      {displayUser.image ? (
        <img src={displayUser.image} alt={displayUser.name} className="w-full h-full object-cover" />
      ) : (
        <User className="w-5 h-5 text-indigo-500" />
      )}
    </button>
  );

  return (
    <>
      <Sheet.Root license="commercial">
        <Sheet.Trigger asChild>
          <div ref={accountSheetRef as any}>
            {trigger || defaultTrigger}
          </div>
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
            className="AccountSheet-content"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
          >
            <div className="AccountSheet-innerContent">
              <div className="p-8 flex-shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">{isCurrentUser ? 'Account' : 'User Profile'}</h2>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                      <img
                        src={displayUser.image}
                        alt={displayUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{displayUser.name}</h3>
                      <p className="text-xs text-gray-500">Nostr User</p>
                    </div>
                  </div>
                  {displayUser.createdAt && (
                    <div className="text-xs text-gray-400">
                      Member since {displayUser.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8">
                <div className="space-y-2">
                  <button
                    onClick={handlePublicKeyClick}
                    className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-4 h-4 text-gray-500" />
                      <p className="text-xs font-medium text-gray-700">Public Key</p>
                    </div>
                    <code className="text-xs break-all text-gray-900 font-mono block">{displayUser.pubkey}</code>
                  </button>

                  {isCurrentUser ? (
                    <>
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Profile Settings</span>
                      </button>

                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                        <Key className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Manage Keys</span>
                      </button>

                      <button
                        onClick={handleNotificationsClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Bell className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Notifications</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleViewProfile}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">View Profile</span>
                      </button>

                      <button
                        onClick={handleMakeAdmin}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Shield className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Make Admin</span>
                      </button>

                      <button
                        onClick={handleKickUser}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left text-red-600"
                      >
                        <UserX className="w-5 h-5" />
                        <span>Kick from Chat</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isCurrentUser && (
                <div className="p-8 pt-4 flex-shrink-0">
                  <hr className="mb-4 border-gray-300" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </Sheet.Content>
          {showNotificationsSheet && (
            <NotificationsSheet
              trigger={
                <button
                  ref={notificationsButtonRef}
                  style={{ display: 'none' }}
                />
              }
            />
          )}
        </Sheet.View>
      </Sheet.Portal>
      </Sheet.Root>
      {showPublicKeySheet && (
        <PublicKeySheet
          trigger={
            <button
              ref={publicKeyButtonRef}
              style={{ display: 'none' }}
            />
          }
          pubkey={displayUser.pubkey}
        />
      )}
    </>
  );
}
