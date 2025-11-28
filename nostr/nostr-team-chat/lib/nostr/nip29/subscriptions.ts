import type { NIP29RelayClient } from './client';
import type { NostrEvent, NIP29Group, SubscriptionFilter } from './types';
import { NIP29EventKind } from './types';
import { parseGroupMetadataFromTags, extractAllTagValues } from './utils';

// Helper to cast NIP29EventKind to number for NDK compatibility
const asKind = (kind: NIP29EventKind): number => kind as number;
const asKinds = (...kinds: NIP29EventKind[]): number[] => kinds.map(k => k as number);

export class NIP29SubscriptionManager {
  private subscriptions: Map<string, string> = new Map();

  constructor(private client: NIP29RelayClient) {}

  subscribeToGroupMetadata(
    groupId: string,
    onUpdate: (group: Partial<NIP29Group>) => void
  ): string {
    const parts = groupId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : groupId;

    const subId = this.client.subscribe(
      [
        {
          kinds: [asKind(NIP29EventKind.GroupMetadata)],
          '#d': [localGroupId],
          limit: 1,
        },
      ],
      (event: NostrEvent) => {
        // Parse metadata from tags (NIP-29 standard for relay-generated 39000 events)
        const metadata = parseGroupMetadataFromTags(event.tags);
        const update: Partial<NIP29Group> = {
          groupId,
          description: typeof metadata.about === 'string' ? metadata.about : undefined,
          picture: typeof metadata.picture === 'string' ? metadata.picture : undefined,
          isOpen: metadata.open === true,
          isPublic: metadata.public === true,
          updatedAt: event.created_at * 1000,
        };

        if (typeof metadata.name === 'string') {
          update.name = metadata.name;
        }

        onUpdate(update);
      }
    );

    this.subscriptions.set(`metadata-${groupId}`, subId);
    return subId;
  }

  subscribeToGroupAdmins(
    groupId: string,
    onUpdate: (admins: string[]) => void
  ): string {
    const parts = groupId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : groupId;

    const subId = this.client.subscribe(
      [
        {
          kinds: [asKind(NIP29EventKind.GroupAdmins)],
          '#d': [localGroupId],
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
    const parts = groupId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : groupId;

    const subId = this.client.subscribe(
      [
        {
          kinds: [asKind(NIP29EventKind.GroupMembers)],
          '#d': [localGroupId],
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
    const parts = groupId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : groupId;

    const filter: SubscriptionFilter = {
      kinds: [NIP29EventKind.GroupChatMessage],
      '#h': [localGroupId],
    } as SubscriptionFilter;

    if (since) {
      filter.since = since;
    } else {
      filter.limit = 100;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subId = this.client.subscribe([filter] as any, (event: NostrEvent) => {
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
          kinds: asKinds(
            NIP29EventKind.AddUser,
            NIP29EventKind.RemoveUser,
            NIP29EventKind.EditMetadata,
            NIP29EventKind.AddPermission,
            NIP29EventKind.RemovePermission,
            NIP29EventKind.DeleteEvent,
            NIP29EventKind.DeleteGroup,
          ),
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
          kinds: [asKind(NIP29EventKind.JoinRequest)],
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
          kinds: [asKind(NIP29EventKind.GroupMembers)],
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
