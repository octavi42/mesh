/**
 * NIP-29 Event Kinds
 * Based on the official NIP-29 specification for relay-based groups
 */

export const NIP29EventKind = {
  // Group management events
  CreateGroup: 9007,
  DeleteGroup: 9008,
  CreateInvite: 9009,

  // Member management events
  AddUser: 9000,
  RemoveUser: 9001,
  EditMetadata: 9002,
  AddPermission: 9003,
  RemovePermission: 9004,
  DeleteEvent: 9005,
  EditGroupStatus: 9006,

  // User request events
  JoinRequest: 9021,
  LeaveRequest: 9022,

  // Group metadata events
  GroupMetadata: 39000,
  GroupAdmins: 39001,
  GroupMembers: 39002,
  GroupEditHistory: 39003,
} as const;

export type NIP29EventKindType = typeof NIP29EventKind[keyof typeof NIP29EventKind];

/**
 * Group status types for NIP-29 groups
 */
export const GroupStatus = {
  Public: 'public',
  Private: 'private',
} as const;

export const GroupType = {
  Open: 'open',
  Closed: 'closed',
  Broadcast: 'broadcast',
} as const;

/**
 * Standard roles for group members
 */
export const GroupRole = {
  Owner: 'owner',
  Admin: 'admin',
  Moderator: 'moderator',
  Member: 'member',
} as const;

/**
 * Permissions for group members
 */
export const GroupPermission = {
  AddUser: 'add-user',
  EditMetadata: 'edit-metadata',
  DeleteEvent: 'delete-event',
  RemoveUser: 'remove-user',
  AddPermission: 'add-permission',
  RemovePermission: 'remove-permission',
  EditGroupStatus: 'edit-group-status',
  DeleteGroup: 'delete-group',
} as const;

/**
 * Tag names used in NIP-29 events
 */
export const NIP29Tags = {
  GroupId: 'h',
  Pubkey: 'p',
  InviteCode: 'code',
  Role: 'role',
  Permission: 'permission',
  Reason: 'reason',
  Expiration: 'expiration',
  EventId: 'e',
  GroupStatus: 'status',
  GroupType: 'type',
} as const;