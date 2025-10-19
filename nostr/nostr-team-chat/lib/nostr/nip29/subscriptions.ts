import type { NIP29RelayClient } from './client';
import type { NostrEvent, NIP29Group, SubscriptionFilter } from './types';
import { NIP29EventKind } from './types';
import { parseGroupMetadata, extractAllTagValues } from './utils';

export class NIP29SubscriptionManager {
  private subscriptions: Map<string, string> = new Map();

  constructor(private client: NIP29RelayClient) {}

  subscribeToGroupMetadata(
    groupId: string,
    onUpdate: (group: Partial<NIP29Group>) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [NIP29EventKind.GroupMetadata],
          '#h': [groupId],
          limit: 1,
        },
      ],
      (event: NostrEvent) => {
        const metadata = parseGroupMetadata(event.content);
        onUpdate({
          groupId,
          name: metadata.name,
          description: metadata.about,
          picture: metadata.picture,
          isOpen: metadata.open === true,
          isPublic: metadata.public === true,
          updatedAt: event.created_at * 1000,
        });
      }
    );

    this.subscriptions.set(`metadata-${groupId}`, subId);
    return subId;
  }

  subscribeToGroupAdmins(
    groupId: string,
    onUpdate: (admins: string[]) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [NIP29EventKind.GroupAdmins],
          '#h': [groupId],
          limit: 1,
        },
      ],
      (event: NostrEvent) => {
        const admins = extractAllTagValues(event.tags, 'p');
        onUpdate(admins);
      }
    );

    this.subscriptions.set(`admins-${groupId}`, subId);
    return subId;
  }

  subscribeToGroupMembers(
    groupId: string,
    onUpdate: (members: string[]) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [NIP29EventKind.GroupMembers],
          '#h': [groupId],
          limit: 1,
        },
      ],
      (event: NostrEvent) => {
        const members = extractAllTagValues(event.tags, 'p');
        onUpdate(members);
      }
    );

    this.subscriptions.set(`members-${groupId}`, subId);
    return subId;
  }

  subscribeToGroupMessages(
    groupId: string,
    onMessage: (event: NostrEvent) => void,
    channelName?: string,
    since?: number
  ): string {
    const filter: SubscriptionFilter = {
      kinds: [NIP29EventKind.GroupChatMessage],
      '#h': [groupId],
    };

    if (since) {
      filter.since = since;
    } else {
      filter.limit = 100;
    }

    const subId = this.client.subscribe([filter], (event: NostrEvent) => {
      if (channelName) {
        const eventChannel = event.tags.find(([tag]) => tag === 'c')?.[1];
        if (eventChannel !== channelName) return;
      }

      onMessage(event);
    });

    const key = channelName ? `messages-${groupId}-${channelName}` : `messages-${groupId}`;
    this.subscriptions.set(key, subId);
    return subId;
  }

  subscribeToModerationEvents(
    groupId: string,
    onEvent: (event: NostrEvent) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [
            NIP29EventKind.AddUser,
            NIP29EventKind.RemoveUser,
            NIP29EventKind.EditMetadata,
            NIP29EventKind.AddPermission,
            NIP29EventKind.RemovePermission,
            NIP29EventKind.DeleteEvent,
            NIP29EventKind.DeleteGroup,
          ],
          '#h': [groupId],
        },
      ],
      onEvent
    );

    this.subscriptions.set(`moderation-${groupId}`, subId);
    return subId;
  }

  subscribeToJoinRequests(
    groupId: string,
    onRequest: (event: NostrEvent) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [NIP29EventKind.JoinRequest],
          '#h': [groupId],
        },
      ],
      onRequest
    );

    this.subscriptions.set(`join-requests-${groupId}`, subId);
    return subId;
  }

  subscribeToMyGroups(
    myPubkey: string,
    onGroupFound: (groupId: string) => void
  ): string {
    const subId = this.client.subscribe(
      [
        {
          kinds: [NIP29EventKind.GroupMembers],
          '#p': [myPubkey],
        },
      ],
      (event: NostrEvent) => {
        const groupId = event.tags.find(([tag]) => tag === 'h')?.[1];
        if (groupId) {
          onGroupFound(groupId);
        }
      }
    );

    this.subscriptions.set(`my-groups-${myPubkey}`, subId);
    return subId;
  }

  unsubscribe(key: string): void {
    const subId = this.subscriptions.get(key);
    if (subId) {
      this.client.unsubscribe(subId);
      this.subscriptions.delete(key);
    }
  }

  unsubscribeFromGroup(groupId: string): void {
    const keysToRemove: string[] = [];

    this.subscriptions.forEach((_, key) => {
      if (key.includes(groupId)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.unsubscribe(key));
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((subId) => {
      this.client.unsubscribe(subId);
    });
    this.subscriptions.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}
