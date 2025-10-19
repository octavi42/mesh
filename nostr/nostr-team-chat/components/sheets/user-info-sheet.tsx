'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, LogOut, UserMinus, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { showConfirmation } from '@/components/ui/global-confirmation-dialog';
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
  onDismissParent?: () => void;
}

interface ConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmStyle?: 'danger' | 'primary';
}

function ConfirmationSheet({ isOpen, onClose, onConfirm, title, message, confirmText, confirmStyle = 'primary' }: ConfirmationSheetProps) {
  console.log('ConfirmationSheet render, isOpen:', isOpen, 'title:', title);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmStyle === 'danger' ? 'bg-red-100' : 'bg-indigo-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${confirmStyle === 'danger' ? 'text-red-600' : 'text-indigo-600'}`} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                confirmStyle === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserInfoSheet({ user, trigger, isAdmin = false, onDismissParent }: UserInfoSheetProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  const handleKickClick = () => {
    if (dismissButtonRef.current) {
      dismissButtonRef.current.click();
      if (onDismissParent) {
        setTimeout(() => {
          onDismissParent();
          setTimeout(() => {
            showConfirmation(
              'Kick User',
              `Are you sure you want to kick ${user.name || 'this user'} from the chat?`,
              'Kick',
              'danger',
              () => {
                console.log('Confirmed kick user:', user.id);
              }
            );
          }, 300);
        }, 200);
      } else {
        setTimeout(() => {
          showConfirmation(
            'Kick User',
            `Are you sure you want to kick ${user.name || 'this user'} from the chat?`,
            'Kick',
            'danger',
            () => {
              console.log('Confirmed kick user:', user.id);
            }
          );
        }, 400);
      }
    }
  };

  const handleAdminClick = () => {
    if (dismissButtonRef.current) {
      dismissButtonRef.current.click();
      if (onDismissParent) {
        setTimeout(() => {
          onDismissParent();
          setTimeout(() => {
            showConfirmation(
              'Make Admin',
              `Are you sure you want to make ${user.name || 'this user'} an admin?`,
              'Confirm',
              'primary',
              () => {
                console.log('Confirmed make admin:', user.id);
              }
            );
          }, 300);
        }, 200);
      } else {
        setTimeout(() => {
          showConfirmation(
            'Make Admin',
            `Are you sure you want to make ${user.name || 'this user'} an admin?`,
            'Confirm',
            'primary',
            () => {
              console.log('Confirmed make admin:', user.id);
            }
          );
        }, 400);
      }
    }
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
              className="UserInfoSheet-content"
              stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            >
              <div className="UserInfoSheet-innerContent">
                <Sheet.Trigger action="dismiss" asChild>
                  <button ref={dismissButtonRef} data-sheet-dismiss style={{ display: 'none' }} />
                </Sheet.Trigger>
                <div className="p-8 pb-4 flex-shrink-0">
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 mb-4">
                      <img
                        src={user.image}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name || 'Anonymous'}</h3>
                  </div>
                </div>

                <div className="px-8">
                  <div className="space-y-4">
                    {user.role && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                          <p className="text-sm text-gray-900 dark:text-white">{user.role}</p>
                        </div>
                      </div>
                    )}

                    {user.pubkey && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Public Key</p>
                        <code className="text-xs break-all text-gray-900 dark:text-gray-100 font-mono">{user.pubkey}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 pt-4 flex-shrink-0 mt-auto">
                  <div className="space-y-2">
                    <button
                      onClick={() => console.log('View profile:', user.id)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      View Profile
                    </button>
                    <button
                      onClick={handleAdminClick}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Make Admin
                    </button>
                    <button
                      onClick={handleKickClick}
                      className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserMinus className="w-4 h-4" />
                      Kick from Chat
                    </button>
                  </div>
                </div>
              </div>
            </Sheet.Content>
          </Sheet.View>
        </Sheet.Portal>
      </Sheet.Root>

    </>
  );
}
