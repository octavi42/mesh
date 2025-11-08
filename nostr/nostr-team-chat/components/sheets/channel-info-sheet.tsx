'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Hash, Calendar, Trash2, Users, Lock, Globe, Crown, MessageSquare, Activity, Eye, UserPlus, Settings, ExternalLink, Clock, TrendingUp, Shield } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannelStore } from '@/lib/stores/channel-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { useGroupMembers } from '@/lib/hooks/use-group-members';
import { useMessageStore } from '@/lib/stores/message-store';
import { showConfirmation } from '@/components/ui/global-confirmation-dialog';
import { db } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';

interface ChannelInfoSheetProps {
  trigger?: React.ReactNode;
}

export function ChannelInfoSheet({ trigger }: ChannelInfoSheetProps) {
  const { currentChannelId, currentWorkspaceId } = useChatStore();
  const { getChannelById, removeChannel } = useChannelStore();
  const { workspaces } = useWorkspaceStore();
  const { messages } = useMessageStore();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!currentChannel || !currentChannelId) return;

    showConfirmation(
      'Delete Channel',
      `Are you sure you want to delete the channel #${currentChannel.name}? This action cannot be undone and all messages will be permanently deleted.`,
      'Delete Channel',
      'danger',
      async () => {
        setIsDeleting(true);
        try {
          // Navigate to workspace since we're deleting the current channel
          if (currentWorkspaceId) {
            router.push(`/app/w/${currentWorkspaceId}`);
          }

          // Delete from database
          await db.channels.delete(currentChannelId);

          // Delete related messages
          await db.messages.where('channelId').equals(currentChannelId).delete();

          // Remove from store
          removeChannel(currentChannelId);

          console.log('✅ Channel deleted successfully:', currentChannelId);
        } catch (error) {
          console.error('❌ Failed to delete channel:', error);
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

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
            className="bg-white rounded-3xl shadow-2xl w-full overflow-y-auto my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{ maxWidth: '540px', height: 'auto' }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light text-slate-900">
                  {currentWorkspace?.name || currentChannel?.name || 'Channel'}
                </h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
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
                    <div className="text-3xl font-light text-gray-900">{channelStats.totalMessages.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 mt-1">Messages</div>
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
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 w-full py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete Channel'}</span>
                  </button>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}