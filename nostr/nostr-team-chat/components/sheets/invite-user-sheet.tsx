'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, UserPlus, Search } from 'lucide-react';

interface InviteUserSheetProps {
  trigger?: React.ReactNode;
}

export function InviteUserSheet({ trigger }: InviteUserSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleInvite = () => {
    console.log('Inviting user:', searchQuery);
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
                <h2 className="text-2xl font-light text-slate-900">Invite Member</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Search for a user by their Nostr public key or npub
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="user-search" className="text-sm font-medium text-slate-700">
                    Public Key or npub
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="user-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="npub1... or hex public key"
                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900 font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Enter the user's Nostr public key to invite them to this workspace
                  </p>
                </div>

                <button
                  onClick={handleInvite}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm mt-2 flex items-center justify-center gap-2"
                  disabled={!searchQuery}
                >
                  <UserPlus className="w-5 h-5" />
                  Send Invitation
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
