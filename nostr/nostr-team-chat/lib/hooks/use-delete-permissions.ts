'use client';

import { useWorkspaceMembers } from './use-nip29-workspace';
import { useAuthStore } from '@/lib/stores/auth-store';

interface UseDeletePermissionsProps {
  groupId: string;
  messageAuthorPubkey?: string;
}

export function useDeletePermissions({ groupId, messageAuthorPubkey }: UseDeletePermissionsProps) {
  const { pubkey: currentUserPubkey } = useAuthStore();
  const { isAdmin: isAdminFn } = useWorkspaceMembers(groupId);

  // Check if current user is admin
  const isAdmin = currentUserPubkey ? isAdminFn(currentUserPubkey) : false;

  // Check if current user is the message author
  const isMessageAuthor = messageAuthorPubkey && currentUserPubkey === messageAuthorPubkey;

  // Can delete message if user is the author OR is an admin
  const canDeleteMessage = isMessageAuthor || isAdmin;

  // Can delete group/chat only if user is admin
  const canDeleteGroup = isAdmin;

  return {
    canDeleteMessage,
    canDeleteGroup,
    isAdmin,
    isMessageAuthor,
  };
}