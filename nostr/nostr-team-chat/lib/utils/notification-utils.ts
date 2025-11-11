import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Utility function to update notification status with retry logic
 */
export const updateNotificationStatusWithRetry = async (
  notificationId: string,
  action: () => Promise<void>,
  maxRetries: number = 3
): Promise<void> => {
  const { updateNotificationStatus, fetchNotificationsFromRelay } = useNotificationStore.getState();
  const { pubkey } = useAuthStore.getState();

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      console.log(`🔄 Attempting notification status update (attempt ${attempt + 1}/${maxRetries})`);
      await action();
      console.log('✅ Notification status update succeeded');
      return;
    } catch (error) {
      attempt++;
      lastError = error as Error;

      console.warn(`⚠️ Notification status update failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt >= maxRetries) {
        console.error('❌ All retry attempts failed, falling back to refresh');

        // Fallback: refresh all notifications from relay
        if (pubkey) {
          try {
            console.log('🔄 Refreshing all notifications from relay as fallback');
            await fetchNotificationsFromRelay(pubkey, 24);
            console.log('✅ Fallback refresh completed');
          } catch (refreshError) {
            console.error('❌ Fallback refresh also failed:', refreshError);
          }
        }

        throw lastError;
      }

      // Wait before retry (exponential backoff)
      const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Wrapper for invite acceptance with retry logic
 */
export const acceptInviteWithRetry = async (
  notificationId: string,
  acceptAction: () => Promise<void>
): Promise<void> => {
  return updateNotificationStatusWithRetry(notificationId, async () => {
    await acceptAction();

    // Update status after successful acceptance
    const { updateNotificationStatus } = useNotificationStore.getState();
    updateNotificationStatus(notificationId, 'accepted');
  });
};

/**
 * Wrapper for invite decline with retry logic
 */
export const declineInviteWithRetry = async (
  notificationId: string,
  declineAction: () => Promise<void>
): Promise<void> => {
  return updateNotificationStatusWithRetry(notificationId, async () => {
    await declineAction();

    // Update status after successful decline
    const { updateNotificationStatus } = useNotificationStore.getState();
    updateNotificationStatus(notificationId, 'declined');
  });
};

/**
 * Wrapper for marking invite as seen with retry logic
 */
export const markInviteSeenWithRetry = async (
  notificationId: string,
  markSeenAction: () => Promise<void>
): Promise<void> => {
  return updateNotificationStatusWithRetry(notificationId, async () => {
    await markSeenAction();

    // Update status after successfully marking as seen
    const { updateNotificationStatus } = useNotificationStore.getState();
    updateNotificationStatus(notificationId, 'seen');
  });
};

/**
 * Wrapper for invite deletion with retry logic
 */
export const deleteInviteWithRetry = async (
  notificationId: string,
  deleteAction: () => Promise<void>
): Promise<void> => {
  return updateNotificationStatusWithRetry(notificationId, async () => {
    await deleteAction();

    // Update status after successful deletion
    const { updateNotificationStatus } = useNotificationStore.getState();
    updateNotificationStatus(notificationId, 'deleted');
  });
};

/**
 * Check if an error is recoverable (worth retrying)
 */
export const isRecoverableError = (error: Error): boolean => {
  const errorMessage = error.message.toLowerCase();

  // Don't retry these errors
  const nonRecoverableErrors = [
    'user rejected',
    'cancelled',
    'denied',
    'invalid invite',
    'expired',
    'not found'
  ];

  return !nonRecoverableErrors.some(msg => errorMessage.includes(msg));
};

/**
 * Enhanced error handler for notification operations
 */
export const handleNotificationError = (error: Error, operation: string): string => {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('timeout') || errorMessage.includes('signing timeout')) {
    return 'Operation timed out. Please check your Nostr extension (like Alby) and ensure popups are allowed, then try again.';
  }

  if (errorMessage.includes('user rejected') || errorMessage.includes('cancelled')) {
    return `You cancelled the ${operation}. Try again if you want to continue.`;
  }

  if (errorMessage.includes('connection') || errorMessage.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (errorMessage.includes('relay')) {
    return 'Relay error. The server may be temporarily unavailable.';
  }

  return `Failed to ${operation}: ${error.message}`;
};