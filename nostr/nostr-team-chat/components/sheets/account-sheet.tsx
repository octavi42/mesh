'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, User, Key, LogOut, Bell, UserX, Shield, Palette } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { NotificationsSheet } from './notifications-sheet';
import { PublicKeySheet } from './public-key-sheet';
import { useAuthStore } from '@/lib/stores/auth-store';
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
  console.log('AccountSheet rendering', { trigger, user, isCurrentUser });
  const { logout, pubkey: authPubkey, npub: authNpub } = useAuthStore();
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [showPublicKeySheet, setShowPublicKeySheet] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const publicKeyButtonRef = useRef<HTMLButtonElement>(null);
  const accountSheetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const displayUser = user || {
    name: 'You',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser',
    pubkey: authNpub || authPubkey || 'Loading...',
    createdAt: new Date('2024-01-15')
  };

  const handleSignOut = async () => {
    console.log('🔴 Sign Out button clicked');

    // Close the account sheet first
    accountSheetRef.current?.click();

    if (typeof window !== 'undefined') {
      // Clear nostr-login data immediately
      console.log('🧹 Clearing nostr-login data from account sheet');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nostr-login') || key.startsWith('nl-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('🧹 Removing:', key);
        localStorage.removeItem(key);
      });

      // Clear auth store
      localStorage.removeItem('nostr-auth');

      // Dispatch logout event
      console.log('🔴 Dispatching nlLogout event');
      document.dispatchEvent(new Event('nlLogout'));

      // Force redirect to home page immediately
      console.log('🔀 Force redirecting to /');
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    }
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

  const handleThemeChange = () => {
    console.log('Theme toggle clicked, current theme:', theme);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('New theme will be:', newTheme);
    setTheme(newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to html');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from html');
    }

    localStorage.setItem('theme', newTheme);
    console.log('Saved to localStorage:', newTheme);
  };

  const defaultTrigger = (
    <button
      style={{
        background: 'red',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid blue',
        position: 'relative',
        zIndex: 9999,
        flexShrink: 0
      }}
      className="flex items-center justify-center cursor-pointer"
    >
      {displayUser.image ? (
        <img src={displayUser.image} alt={displayUser.name} className="w-full h-full object-cover rounded-full" />
      ) : (
        <User className="w-5 h-5 text-white" />
      )}
    </button>
  );

  return (
    <>
      <Sheet.Root license="commercial">
        <Sheet.Trigger asChild>
          {trigger || defaultTrigger}
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
              <Sheet.Trigger action="dismiss" asChild>
                <button ref={accountSheetRef} style={{ display: 'none' }} />
              </Sheet.Trigger>
              <div className="p-8 flex-shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isCurrentUser ? 'Account' : 'User Profile'}</h2>
                </div>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <img
                        src={displayUser.image}
                        alt={displayUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{displayUser.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nostr User</p>
                    </div>
                  </div>
                  {displayUser.createdAt && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Member since {displayUser.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8">
                <div className="space-y-2">
                  <button
                    onClick={handlePublicKeyClick}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Public Key</p>
                    </div>
                    <code className="text-xs break-all text-gray-900 dark:text-gray-300 font-mono block">{displayUser.pubkey}</code>
                  </button>

                  {isCurrentUser ? (
                    <>
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">Profile Settings</span>
                      </button>

                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left">
                        <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">Manage Keys</span>
                      </button>

                      <button
                        onClick={handleNotificationsClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                      >
                        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">Notifications</span>
                      </button>

                      <button
                        onClick={handleThemeChange}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                      >
                        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">Theme: {theme === 'light' ? 'Light' : 'Dark'}</span>
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
                  <hr className="mb-4 border-gray-300 dark:border-gray-700" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-red-600 dark:text-red-400"
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
