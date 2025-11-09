'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { db } from '@/lib/db/schema';
import { sendMessageEvent } from '@/lib/nostr/nip29/events';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';

interface CreateChannelSheetProps {
  trigger?: React.ReactNode;
  workspaceId: string;
}

export function CreateChannelSheet({ trigger, workspaceId }: CreateChannelSheetProps) {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { setCurrentChannel } = useChatStore();

  const handleCreate = async () => {
    if (!channelName || isCreating) return;

    setIsCreating(true);
    try {
      const sanitizedName = channelName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      // Create deterministic channel ID based on workspace and channel name
      const channelId = `${workspaceId}-${sanitizedName}`;

      // Check if channel already exists
      const existingChannel = await db.channels.get(channelId);
      if (existingChannel) {
        console.log('Channel already exists:', sanitizedName);
        // Don't auto-navigate to the channel - let user choose
      // setCurrentChannel(channelId);
        setChannelName('');
        setChannelDescription('');
        return;
      }

      // Add channel to local DB
      await db.channels.add({
        id: channelId,
        workspaceId,
        name: sanitizedName,
        description: channelDescription,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Send a welcome message to establish the channel on the relay
      // This creates the channel implicitly via the 'c' tag
      const client = getGlobalNIP29Client();
      console.log('📤 Creating welcome message for channel:', sanitizedName, 'in workspace:', workspaceId);

      const welcomeMessage = await sendMessageEvent(
        workspaceId,
        `Channel #${sanitizedName} created!`,
        sanitizedName
      );

      console.log('📝 Welcome message created:', {
        kind: welcomeMessage.kind,
        tags: welcomeMessage.tags,
        content: welcomeMessage.content
      });

      await client.publishEvent(welcomeMessage);

      // Don't auto-navigate to the channel - let user choose
      // setCurrentChannel(channelId);
      setChannelName('');
      setChannelDescription('');

      console.log('✅ Channel created and published to relay:', sanitizedName);

      // Force refresh channels after a short delay to pick up the new channel
      setTimeout(async () => {
        const { refreshChannelsForWorkspace } = await import('@/lib/hooks/use-channels');
        await refreshChannelsForWorkspace(workspaceId);
        console.log('🔄 Triggered channel refresh after creation');
      }, 1000);
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setIsCreating(false);
    }
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

                <Sheet.Trigger action="dismiss" asChild>
                  <button
                    onClick={handleCreate}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!channelName || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Channel'}
                  </button>
                </Sheet.Trigger>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
