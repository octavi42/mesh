'use client';

import { ReactNode } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, LogOut, UserMinus } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import './user-info-sheet.css';

interface User {
  id: string | number;
  name?: string;
  image: string;
  pubkey?: string;
  role?: string;
}

interface UserInfoSheetProps {
  user: User;
  trigger: ReactNode;
  isAdmin?: boolean;
}

export function UserInfoSheetContent({ user, isAdmin = false }: Omit<UserInfoSheetProps, 'trigger'>) {
  const handleKickUser = () => {
    console.log('Kick user:', user.id);
  };

  return (
    <>
      <Sheet.Backdrop
        travelAnimation={{
          opacity: "1",
          backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
          backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
        }}
      />
      <Sheet.Content
        className="UserInfoSheet-content"
        stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
      >
              <div className="UserInfoSheet-innerContent">
                <div className="p-8 pb-4 flex-shrink-0">
                  <div className="flex items-center justify-end mb-6">
                    <Sheet.Trigger action="dismiss" asChild>
                      <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </Sheet.Trigger>
                  </div>

                  <div className="mb-6 flex flex-col items-center -mt-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-4">
                      <img
                        src={user.image}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{user.name || 'Anonymous'}</h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8">
                  <div className="space-y-4">
                    {user.role && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Role</p>
                          <p className="text-sm text-gray-900">{user.role}</p>
                        </div>
                      </div>
                    )}

                    {user.pubkey && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">Public Key</p>
                        <code className="text-xs break-all text-gray-900 font-mono">{user.pubkey}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 pt-4 flex-shrink-0">
                  <div className="space-y-2">
                    {isAdmin && (
                      <button
                        onClick={handleKickUser}
                        className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" />
                        Kick from Chat
                      </button>
                    )}
                    <Sheet.Trigger action="dismiss" asChild>
                      <button className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Close
                      </button>
                    </Sheet.Trigger>
                  </div>
                </div>
              </div>
            </Sheet.Content>
    </>
  );
}

export function UserInfoSheet({ user, trigger, isAdmin = false }: UserInfoSheetProps) {
  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        {trigger}
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true} style={{ zIndex: 9999 }}>
          <UserInfoSheetContent user={user} isAdmin={isAdmin} />
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
