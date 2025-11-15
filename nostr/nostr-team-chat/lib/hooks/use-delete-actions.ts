'use client';

import { useState } from 'react';
import { deleteEventEvent, deleteGroupEvent } from '@/lib/nostr/nip29/events';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import { toast } from 'sonner';

export function useDeleteActions(groupId: string) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMessage = async (messageId: string) => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const deleteEvent = await deleteEventEvent(groupId, messageId);
      const client = getGlobalNIP29Client();
      await client.publishEvent(deleteEvent);

      // Optionally refresh messages or update local state
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteGroup = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const deleteEvent = await deleteGroupEvent(groupId);
      const client = getGlobalNIP29Client();
      await client.publishEvent(deleteEvent);

      toast.success('Group deleted');
      // Redirect user away from deleted group
      window.location.href = '/app';
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteMessage,
    deleteGroup,
    isDeleting,
  };
}