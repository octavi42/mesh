'use client';

import { getGlobalNIP29Client } from './nip29/client';
import { NIP29EventKind } from './nip29/types';
import type { NostrEvent } from './nip29/types';
import { createInviteNotification } from '@/lib/stores/notification-store';

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
    console.log('🔔 Starting invite subscription for user:', userPubkey);

    // Stop existing subscription if any
    this.stopListening();

    // Ensure client is connected
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    this.userPubkey = userPubkey;

    // Subscribe to invite notification events targeting this user
    const filter = {
      kinds: [1], // Text notes used for invite notifications
      '#p': [userPubkey], // Events that tag this user
      '#t': ['invite'], // Must have invite tag
      since: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // Last 24 hours
    };

    console.log('📡 Subscribing to invite events with filter:', filter);

    try {
      // @ts-ignore - relay subscription types
      this.subscription = this.client.relay?.subscribe([filter], {
        onevent: (event: NostrEvent) => {
          console.log('📨 Received invite event:', event);
          this.handleInviteEvent(event);
        },
        oneose: () => {
          console.log('📡 Invite subscription EOSE received');
        },
        onclose: (reason: string) => {
          console.log('📡 Invite subscription closed:', reason);
        }
      });

      console.log('✅ Invite subscription started');
    } catch (error) {
      console.error('❌ Failed to start invite subscription:', error);
      throw error;
    }
  }

  stopListening(): void {
    if (this.subscription) {
      console.log('🔇 Stopping invite subscription');
      try {
        this.subscription.close();
      } catch (error) {
        console.warn('Warning: Failed to close subscription:', error);
      }
      this.subscription = null;
    }
    this.userPubkey = null;
  }

  isListening(): boolean {
    return this.subscription !== null;
  }

  private async handleInviteEvent(event: NostrEvent): Promise<void> {
    try {
      console.log('🎯 Processing invite notification event:', {
        id: event.id,
        pubkey: event.pubkey,
        tags: event.tags,
        content: event.content.substring(0, 100) + '...'
      });

      // Check if this is an invite notification by verifying tags
      const hasInviteTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'invite');
      const hasNotificationTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'notification');
      const userTag = event.tags.find(tag => tag[0] === 'p');

      if (!hasInviteTag || !userTag || userTag[1] !== this.userPubkey) {
        console.log('❌ Not an invite notification for current user, ignoring');
        return;
      }

      // Parse the invite notification content
      let inviteData;
      try {
        inviteData = JSON.parse(event.content);
      } catch {
        console.warn('Failed to parse invite notification content');
        return;
      }

      // Verify this is an invite notification
      if (inviteData.type !== 'invite') {
        console.log('❌ Not an invite notification, ignoring');
        return;
      }

      // Extract invite details from content and tags
      const inviteCodeTag = event.tags.find(tag => tag[0] === 'invite_code');
      const groupIdTag = event.tags.find(tag => tag[0] === 'group_id');

      // Create notification for the user
      await createInviteNotification(this.userPubkey!, {
        workspaceName: inviteData.groupName || inviteData.title || 'Unknown Workspace',
        inviterName: inviteData.inviterName || 'Someone',
        inviteCode: inviteData.inviteCode || inviteCodeTag?.[1] || 'unknown',
        groupId: inviteData.fullGroupId || (groupIdTag ? `relay'${groupIdTag[1]}` : 'unknown')
      });

      console.log('✅ Created notification from invite notification event');
    } catch (error) {
      console.error('❌ Failed to handle invite notification event:', error);
    }
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