'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Hash, Calendar, Trash2, Users, Lock, Globe, Crown, MessageSquare, Activity, Eye, UserPlus, Settings, ExternalLink, Clock, TrendingUp, Shield } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannelStore } from '@/lib/stores/channel-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useGroupMembers } from '@/lib/hooks/use-group-members';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { useNDK } from '@/lib/hooks/use-ndk';
import { showConfirmation } from '@/components/ui/global-confirmation-dialog';
import { db } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ChannelInfoSheetProps {
  trigger?: React.ReactNode;
}

export function ChannelInfoSheet({ trigger }: ChannelInfoSheetProps) {
  const { currentChannelId, currentWorkspaceId } = useChatStore();
  const { getChannelById, removeChannel } = useChannelStore();
  const { workspaces } = useWorkspaceStore();
  const { messages } = useMessageStore();
  const { ndk } = useNDK();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const currentChannel = currentChannelId ? getChannelById(currentChannelId) : null;
  const currentWorkspace = currentWorkspaceId ? workspaces.find(w => w.id === currentWorkspaceId) : null;

  // Debug information
  console.log('Channel Info Debug:', {
    currentWorkspaceId,
    currentChannelId,
    workspaceCount: workspaces.length,
    currentWorkspace: currentWorkspace ? { id: currentWorkspace.id, name: currentWorkspace.name } : null,
    currentChannel: currentChannel ? { id: currentChannel.id, name: currentChannel.name } : null
  });

  // Get group members data
  const {
    members,
    loading: membersLoading,
    memberCount,
    adminCount,
    regularMemberCount,
    isAdmin: checkIsAdmin
  } = useGroupMembers({
    groupId: currentWorkspaceId || undefined,
    autoRefresh: true
  });

  // Get channels for workspace to count chats
  const channels = useChannels(currentWorkspaceId);

  // Get channel messages for statistics
  const channelMessages = useMemo(() => {
    if (!currentChannelId || !messages[currentChannelId]) return [];
    return messages[currentChannelId] || [];
  }, [currentChannelId, messages]);

  // Calculate channel statistics
  const channelStats = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentMessages = channelMessages.filter(msg => msg.createdAt > oneDayAgo);
    const weekMessages = channelMessages.filter(msg => msg.createdAt > oneWeekAgo);

    // Get unique active users in last 24h
    const recentActiveUsers = new Set(recentMessages.map(msg => msg.authorPubkey));

    // Calculate last activity
    const lastMessage = channelMessages.length > 0 ?
      channelMessages.sort((a, b) => b.createdAt - a.createdAt)[0] : null;

    return {
      totalMessages: channelMessages.length,
      todayMessages: recentMessages.length,
      weekMessages: weekMessages.length,
      activeUsersToday: recentActiveUsers.size,
      lastActivity: lastMessage?.createdAt || 0,
      averageMessagesPerDay: weekMessages.length / 7
    };
  }, [channelMessages]);

  // Get current user info
  const { useAuthStore } = require('@/lib/stores/auth-store');
  const { pubkey: currentUserPubkey } = useAuthStore();
  const isCurrentUserAdmin = currentUserPubkey ? checkIsAdmin(currentUserPubkey) : false;

  const handleDeleteClick = () => {
    setIsDeleteMode(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentWorkspace || !currentWorkspaceId) return;

    // Check if the entered name matches the workspace name
    if (deleteConfirmationName.trim() !== currentWorkspace.name.trim()) {
      return; // Don't proceed if names don't match
    }

    setIsDeleting(true);
    const toastId = `delete-workspace-${currentWorkspaceId}`;

    try {
      console.log('🗑️ Starting workspace deletion process for:', currentWorkspaceId);
      toast.loading(`Deleting workspace "${currentWorkspace.name}"...`, { id: toastId });

      // Close the sheet immediately when deletion starts
      console.log('🔲 Closing sheet immediately as deletion starts');
      if (closeButtonRef.current) {
        closeButtonRef.current.click();
        console.log('🔲 Sheet closed via ref');
      } else {
        console.log('🔲 Close button ref not available, sheet may not close');
      }

      // Smart navigation: try to navigate to another workspace first, fallback to /app
      await navigateAwayFromDeletedWorkspace(currentWorkspaceId);

      // Give navigation time to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // STEP 1: Delete workspace from RELAY first (NIP-29 compliance)
      await deleteWorkspaceFromRelay(currentWorkspaceId, currentWorkspace.name);

      // STEP 2: Clean up local database (this should happen automatically via deletion events)
      // But we also do it here for immediate UI feedback
      await cleanupLocalWorkspaceData(currentWorkspaceId);

      console.log('✅ Workspace deleted successfully:', currentWorkspaceId);
      toast.success(`Workspace "${currentWorkspace.name}" deleted successfully`, { id: toastId });

    } catch (error) {
      console.error('❌ Failed to delete workspace:', error);
      toast.error(`Failed to delete workspace: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setIsDeleting(false);
      setIsDeleteMode(false);
      setDeleteConfirmationName('');
    }
  };

  // Function to delete workspace from relay using NIP-29 deletion events
  const deleteWorkspaceFromRelay = async (workspaceId: string, workspaceName: string) => {
    try {
      console.log('🗑️ Deleting workspace from relay:', workspaceId);

      // Use the proper NIP-29 event creation and client (same pattern as channel deletion)
      const { deleteGroupEvent } = await import('@/lib/nostr/nip29/events');
      const { getGlobalNIP29Client } = await import('@/lib/nostr/nip29');

      // Extract local group ID for relay operations
      const parts = workspaceId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : workspaceId;

      // Create the deletion event using the proper NIP-29 function
      const deleteEvent = await deleteGroupEvent(localGroupId);

      console.log('🗑️ Created workspace deletion event:', {
        kind: deleteEvent.kind,
        tags: deleteEvent.tags,
        groupId: localGroupId
      });

      // Send via the authenticated NIP-29 client
      const client = getGlobalNIP29Client();
      await client.publishEvent(deleteEvent);

      console.log('✅ Workspace deletion event sent successfully with ID:', deleteEvent.id?.slice(0, 8));

    } catch (error) {
      console.error('❌ Failed to delete workspace from relay:', error);
      throw error;
    }
  };

  // Smart navigation function to avoid getting stuck on /app
  const navigateAwayFromDeletedWorkspace = async (workspaceIdToDelete: string) => {
    try {
      console.log('🧭 Smart navigation away from deleted workspace:', workspaceIdToDelete);

      // Get all available workspaces except the one being deleted
      const availableWorkspaces = workspaces.filter(ws => ws.id !== workspaceIdToDelete);

      if (availableWorkspaces.length > 0) {
        // Navigate to the first available workspace with channel selection
        const nextWorkspace = availableWorkspaces[0];
        console.log('🧭 Navigating to next available workspace:', nextWorkspace.name);

        // Try to find a default channel for this workspace
        try {
          const channels = await db.channels.where('workspaceId').equals(nextWorkspace.id).toArray();

          if (channels.length > 0) {
            // Find general channel or use the first available
            const defaultChannel = channels.find(c => c.name === 'general') || channels[0];
            console.log('🧭 Selecting default channel:', defaultChannel.name);

            // Import the chat store to properly set the workspace and channel
            const { useChatStore } = await import('@/lib/stores/chat-store');
            const { setCurrentWorkspace, setCurrentChannel } = useChatStore.getState();

            console.log('🧭 Setting workspace and channel state:', {
              workspaceId: nextWorkspace.id,
              workspaceName: nextWorkspace.name,
              channelId: defaultChannel.id,
              channelName: defaultChannel.name
            });

            // Set workspace and channel
            setCurrentWorkspace(nextWorkspace.id, defaultChannel.id);
            setCurrentChannel(defaultChannel.id);

            console.log('🧭 Navigating to:', `/app/w/${nextWorkspace.id}/c/${defaultChannel.id}`);
            router.push(`/app/w/${nextWorkspace.id}/c/${defaultChannel.id}`);
          } else {
            // No channels available, just go to workspace
            const { useChatStore } = await import('@/lib/stores/chat-store');
            const { setCurrentWorkspace } = useChatStore.getState();
            setCurrentWorkspace(nextWorkspace.id);

            router.push(`/app/w/${nextWorkspace.id}`);
          }
        } catch (channelError) {
          console.warn('❌ Failed to set default channel, navigating to workspace:', channelError);
          const { useChatStore } = await import('@/lib/stores/chat-store');
          const { setCurrentWorkspace } = useChatStore.getState();
          setCurrentWorkspace(nextWorkspace.id);

          router.push(`/app/w/${nextWorkspace.id}`);
        }
      } else {
        // Only navigate to /app if no other workspaces are available
        console.log('🧭 No other workspaces available, navigating to /app');

        // Clear current workspace and channel since none are available
        const { useChatStore } = await import('@/lib/stores/chat-store');
        const { setCurrentWorkspace, setCurrentChannel } = useChatStore.getState();

        // Clear selections - need to check the exact signature for clearing
        try {
          setCurrentWorkspace(''); // Try empty string first
          setCurrentChannel('');
        } catch (e) {
          console.warn('Could not clear workspace/channel selection:', e);
        }

        router.push('/app');
      }

    } catch (error) {
      console.error('❌ Navigation error, fallback to /app:', error);
      router.push('/app');
    }
  };

  // Function to clean up local workspace data
  const cleanupLocalWorkspaceData = async (workspaceId: string) => {
    try {
      console.log('🧹 Cleaning up local workspace data for:', workspaceId);

      // Get all channels for this workspace before deletion
      const workspaceChannels = await db.channels.where('workspaceId').equals(workspaceId).toArray();

      // Delete all messages for channels in this workspace
      for (const channel of workspaceChannels) {
        await db.messages.where('channelId').equals(channel.id).delete();
        console.log('🗑️ Deleted messages for channel:', channel.name);
      }

      // Delete all channels for this workspace
      await db.channels.where('workspaceId').equals(workspaceId).delete();
      console.log('🗑️ Deleted channels for workspace');

      // Delete workspace from database
      await db.nip29Workspaces.delete(workspaceId);
      console.log('🗑️ Deleted workspace from local database');

      console.log('✅ Local workspace data cleanup completed');

    } catch (error) {
      console.error('❌ Failed to cleanup local workspace data:', error);
      throw error;
    }
  };

  const handleCancelDelete = () => {
    // First hide confirmation UI, then show delete button after height animation
    setIsDeleteMode(false);
    setDeleteConfirmationName('');
  };

  const isDeleteButtonEnabled = deleteConfirmationName.trim() === (currentWorkspace?.name.trim() || '');

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  const getChannelTypeInfo = () => {
    // Default to public channel for now - can be enhanced with real metadata
    return {
      isPrivate: false,
      isOpen: true,
      isBroadcast: false,
      icon: Globe,
      type: 'Public Channel',
      description: 'Anyone in the workspace can join and view messages',
      statusColor: 'bg-green-500'
    };
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
            className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{
              maxWidth: '540px',
              height: isDeleteMode ? '650px' : '500px',
              transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div className="p-8 h-full overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light text-slate-900">
                  {currentWorkspace?.name || currentChannel?.name || 'Channel'}
                </h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button
                    ref={closeButtonRef}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="space-y-6">
                {/* Channel Status */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {getChannelTypeInfo().isPrivate ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span>{getChannelTypeInfo().type}</span>
                  {isCurrentUserAdmin && (
                    <span className="flex items-center gap-1 ml-2 text-amber-600">
                      <Crown className="w-4 h-4" />
                      <span>Admin</span>
                    </span>
                  )}
                </div>

                {/* Channel Description */}
                {currentChannel?.description && (
                  <div>
                    <p className="text-gray-600 leading-relaxed">{currentChannel.description}</p>
                  </div>
                )}

                {/* Key Statistics */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-light text-gray-900">{memberCount}</div>
                    <div className="text-sm text-gray-500 mt-1">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-light text-gray-900">{channels?.length || 0}</div>
                    <div className="text-sm text-gray-500 mt-1">Chats</div>
                  </div>
                </div>

                {/* Members Preview */}
                {members.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Members</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {members.slice(0, 6).map((member) => (
                          <div
                            key={member.pubkey}
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white"
                            title={member.name}
                          >
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        ))}
                        {members.length > 6 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs border-2 border-white">
                            +{members.length - 6}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {adminCount} admin{adminCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Channel Details */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-700">{formatDate(currentChannel?.createdAt || Date.now())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last activity</span>
                    <span className="text-gray-700">{formatTimeAgo(channelStats.lastActivity)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 relative">
                  {/* Delete Button */}
                  <div
                    className={`transition-all duration-300 ease-out ${
                      isDeleteMode
                        ? 'opacity-0 -translate-y-2 pointer-events-none'
                        : 'opacity-100 translate-y-0 delay-[400ms]'
                    }`}
                  >
                    <button
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="flex items-center justify-center gap-2 w-full py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Workspace</span>
                    </button>
                  </div>

                  {/* Confirmation UI */}
                  <div
                    className={`absolute top-4 left-0 right-0 space-y-6 transition-all duration-400 ease-out delay-[400ms] ${
                      isDeleteMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <div
                      className={`text-center transition-all duration-300 ease-out delay-[500ms] ${
                        isDeleteMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <h3 className="text-lg font-medium text-red-600 mb-2">Delete Workspace</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        To confirm deletion, please type <span className="font-semibold text-gray-900">"{currentWorkspace?.name}"</span> below:
                      </p>
                    </div>

                    <div
                      className={`transition-all duration-300 ease-out delay-[600ms] ${
                        isDeleteMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <input
                        type="text"
                        value={deleteConfirmationName}
                        onChange={(e) => setDeleteConfirmationName(e.target.value)}
                        placeholder={`Type "${currentWorkspace?.name}" to confirm`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all duration-300"
                        autoFocus={isDeleteMode}
                      />
                    </div>

                    <div
                      className={`flex gap-3 transition-all duration-300 ease-out delay-[700ms] ${
                        isDeleteMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <button
                        onClick={handleCancelDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        disabled={!isDeleteButtonEnabled || isDeleting}
                        className="flex-1 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}