export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UnsignedNostrEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export interface NIP29GroupMetadata {
  name?: string;
  picture?: string;
  about?: string;
  open?: boolean;
  public?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface NIP29Group {
  groupId: string;
  relayUrl: string;
  name: string;
  description?: string;
  picture?: string;
  isOpen: boolean;
  isPublic: boolean;
  admins: string[];
  members: string[];
  roles: GroupRole[];
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
}

export interface GroupRole {
  name: string;
  permissions: string[];
}

export interface GroupMember {
  groupId: string;
  pubkey: string;
  roles: string[];
  joinedAt: number;
}

export interface InviteCode {
  code: string;
  groupId: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  usedCount: number;
}

export enum NIP29EventKind {
  GroupChatMessage = 9,
  GroupThreadMessage = 10,
  GroupThreadReply = 11,
  GroupThread = 12,
  AddUser = 9000,
  RemoveUser = 9001,
  EditMetadata = 9002,
  AddPermission = 9003,
  RemovePermission = 9004,
  DeleteEvent = 9005,
  CreateGroup = 9007,
  DeleteGroup = 9008,
  CreateInvite = 9009,
  JoinRequest = 9021,
  LeaveRequest = 9022,
  GroupMetadata = 39000,
  GroupAdmins = 39001,
  GroupMembers = 39002,
}

export interface RelayResponse {
  success: boolean;
  message?: string;
  eventId?: string;
}

export interface SubscriptionFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#h'?: string[];
  '#e'?: string[];
  '#p'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

export type EventHandler = (event: NostrEvent) => void;
export type EOSEHandler = () => void;
