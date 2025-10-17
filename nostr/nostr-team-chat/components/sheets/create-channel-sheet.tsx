'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X } from 'lucide-react';

interface CreateChannelSheetProps {
  trigger?: React.ReactNode;
}

export function CreateChannelSheet({ trigger }: CreateChannelSheetProps) {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');

  const handleCreate = () => {
    console.log('Creating channel:', { channelName, channelDescription });
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
                <h2 className="text-2xl font-light text-slate-900">Create Channel</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Create a new channel for your workspace
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="channel-name" className="text-sm font-medium text-slate-700">
                    Channel Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">#</span>
                    <input
                      id="channel-name"
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="general"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="channel-description" className="text-sm font-medium text-slate-700">
                    Description (optional)
                  </label>
                  <input
                    id="channel-description"
                    type="text"
                    value={channelDescription}
                    onChange={(e) => setChannelDescription(e.target.value)}
                    placeholder="Team discussions and updates"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm mt-2"
                  disabled={!channelName}
                >
                  Create Channel
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
