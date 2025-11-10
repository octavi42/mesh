'use client';

import { getGlobalNIP29Client } from './nip29/client';
import { NIP29EventKind } from './nip29/types';
import type { NostrEvent } from './nip29/types';
// Note: This subscription system is now disabled in favor of relay-based fetching
// Notifications are fetched on-demand from relay instead of real-time subscription

export interface InviteSubscriptionManager {
  startListening: (userPubkey: string) => Promise<void>;
  stopListening: () => void;
  isListening: () => boolean;
}

class InviteSubscriptionManagerImpl implements InviteSubscriptionManager {
  private subscription: any = null;
  private userPubkey: string | null = null;
  private client = getGlobalNIP29Client();

  async startListening(userPubkey: string): Promise<void> {
    console.log('🔔 Invite subscription disabled - using relay-based fetching instead');
    console.log('ℹ️ To get fresh notifications, use fetchNotificationsFromRelay() in the notification store');

    // Store the userPubkey for compatibility but don't start subscription
    this.userPubkey = userPubkey;
  }

  stopListening(): void {
    console.log('🔇 Invite subscription stop requested - no active subscription to stop');
    this.subscription = null;
    this.userPubkey = null;
  }

  isListening(): boolean {
    return false; // Always return false since subscription is disabled
  }
}

// Global instance
let globalInviteSubscriptionManager: InviteSubscriptionManager | null = null;

export function getGlobalInviteSubscriptionManager(): InviteSubscriptionManager {
  if (!globalInviteSubscriptionManager) {
    globalInviteSubscriptionManager = new InviteSubscriptionManagerImpl();
  }
  return globalInviteSubscriptionManager;
}

// Helper function to start listening for invites
export async function startListeningForInvites(userPubkey: string): Promise<void> {
  const manager = getGlobalInviteSubscriptionManager();
  await manager.startListening(userPubkey);
}

// Helper function to stop listening for invites
export function stopListeningForInvites(): void {
  const manager = getGlobalInviteSubscriptionManager();
  manager.stopListening();
}