'use client';

import { create } from 'zustand';
import { db, type Notification } from '@/lib/db/schema';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // Computed getters
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      loadNotifications: async () => {
        try {
          console.log('📱 Loading notifications from IndexedDB...');
          console.log('📱 Database info:', {
            name: db.name,
            isOpen: db.isOpen(),
            version: db.verno
          });
          set({ isLoading: true });

          // Check if table exists and get count
          const tableExists = await db.notifications.count();
          console.log('📱 Notifications table count:', tableExists);

          const notifications = await db.notifications
            .orderBy('createdAt')
            .reverse()
            .toArray();

          const unreadCount = notifications.filter(n => !n.read).length;

          console.log('📱 Loaded notifications:', {
            total: notifications.length,
            unread: unreadCount,
            notifications: notifications.map(n => ({
              id: n.id,
              userId: n.userId,
              type: n.type,
              title: n.title,
              createdAt: new Date(n.createdAt).toISOString()
            }))
          });

          set({
            notifications,
            unreadCount,
            isLoading: false
          });
        } catch (error) {
          console.error('❌ Failed to load notifications:', error);
          set({ isLoading: false });
        }
      },

      addNotification: async (notificationData) => {
        try {
          const notification: Notification = {
            ...notificationData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
          };

          // Store in IndexedDB
          await db.notifications.add(notification);

          // Update state
          const currentNotifications = get().notifications;
          const newNotifications = [notification, ...currentNotifications];
          const unreadCount = newNotifications.filter(n => !n.read).length;

          set({
            notifications: newNotifications,
            unreadCount
          });

          console.log('📧 Added notification:', notification);
        } catch (error) {
          console.error('Failed to add notification:', error);
          throw error;
        }
      },

      markAsRead: async (notificationId) => {
        try {
          // Update in IndexedDB
          await db.notifications.update(notificationId, { read: true });

          // Update state
          const currentNotifications = get().notifications;
          const updatedNotifications = currentNotifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          const unreadCount = updatedNotifications.filter(n => !n.read).length;

          set({
            notifications: updatedNotifications,
            unreadCount
          });

          console.log('✅ Marked notification as read:', notificationId);
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
          throw error;
        }
      },

      markAllAsRead: async () => {
        try {
          const currentNotifications = get().notifications;
          const unreadIds = currentNotifications
            .filter(n => !n.read)
            .map(n => n.id);

          // Update all unread notifications in IndexedDB
          await Promise.all(
            unreadIds.map(id => db.notifications.update(id, { read: true }))
          );

          // Update state
          const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));

          set({
            notifications: updatedNotifications,
            unreadCount: 0
          });

          console.log('✅ Marked all notifications as read');
        } catch (error) {
          console.error('Failed to mark all notifications as read:', error);
          throw error;
        }
      },

      deleteNotification: async (notificationId) => {
        try {
          // Delete from IndexedDB
          await db.notifications.delete(notificationId);

          // Update state
          const currentNotifications = get().notifications;
          const filteredNotifications = currentNotifications.filter(n => n.id !== notificationId);
          const unreadCount = filteredNotifications.filter(n => !n.read).length;

          set({
            notifications: filteredNotifications,
            unreadCount
          });

          console.log('🗑️ Deleted notification:', notificationId);
        } catch (error) {
          console.error('Failed to delete notification:', error);
          throw error;
        }
      },

      clearAll: async () => {
        try {
          // Clear all notifications from IndexedDB
          await db.notifications.clear();

          // Update state
          set({
            notifications: [],
            unreadCount: 0
          });

          console.log('🗑️ Cleared all notifications');
        } catch (error) {
          console.error('Failed to clear all notifications:', error);
          throw error;
        }
      },

      getUnreadNotifications: () => {
        return (get().notifications || []).filter(n => !n.read);
      },

      getNotificationsByType: (type) => {
        return (get().notifications || []).filter(n => n.type === type);
      },
    }));

// Helper function to create invite notifications
export const createInviteNotification = async (
  userId: string,
  inviteData: {
    workspaceName: string;
    inviterName: string;
    inviteCode: string;
    groupId: string;
  }
) => {
  const { addNotification } = useNotificationStore.getState();

  await addNotification({
    userId,
    type: 'invite',
    title: 'Workspace Invitation',
    message: `${inviteData.inviterName} invited you to join ${inviteData.workspaceName}`,
    data: {
      inviteCode: inviteData.inviteCode,
      groupId: inviteData.groupId,
      workspaceName: inviteData.workspaceName,
      inviterName: inviteData.inviterName,
    },
    read: false,
  });
};

// Helper function to create join request notifications
export const createJoinRequestNotification = async (
  userId: string, // admin receiving the notification
  requestData: {
    workspaceName: string;
    requesterName: string;
    requesterPubkey: string;
    groupId: string;
  }
) => {
  const { addNotification } = useNotificationStore.getState();

  await addNotification({
    userId,
    type: 'join_request',
    title: 'Join Request',
    message: `${requestData.requesterName} wants to join ${requestData.workspaceName}`,
    data: {
      requesterPubkey: requestData.requesterPubkey,
      groupId: requestData.groupId,
      workspaceName: requestData.workspaceName,
      requesterName: requestData.requesterName,
    },
    read: false,
  });
};