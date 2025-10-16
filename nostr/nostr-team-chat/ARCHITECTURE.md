# Nostr Team Chat - Architecture & Implementation Plan

## Overview

A decentralized team chat application built on Nostr protocol, featuring Slack-like functionality without requiring self-hosted relays.

## Core Architecture Decision

**Approach:** Client-Side Enforcement + End-to-End Encryption
**Why:** Achieves team chat features (invites, kicks, deletions) without hosting infrastructure costs.

---

## Technical Stack

### Frontend
- **Next.js 15** - App Router with React 19
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Styling
- **React Compiler** - Automatic memoization (enabled)

### Nostr Layer
- **NDK (Nostr Development Kit)** - Nostr protocol client
- **nostr-tools** - Low-level utilities
- **Public Relays** - nos.lol, relay.damus.io (no self-hosting)

### Data & State
- **Dexie.js** - IndexedDB wrapper with reactive queries
- **Zustand** - Global state management (UI, chat state)
- **useLiveQuery** - Reactive IndexedDB subscriptions

### Encryption
- **@noble/secp256k1** - Elliptic curve cryptography
- **Custom encryption layer** - Per-message encryption keys

---

## Data Architecture

### IndexedDB Schema (Local-First)

```typescript
// lib/db/schema.ts
interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  channelId: string;
  authorPubkey: string;
  content: string;            // Plaintext (local only)
  encryptedContent: string;   // Encrypted blob
  createdAt: number;
  updatedAt: number;
}
```

### Nostr Event Types (Custom Kinds)

| Feature | Event Kind | Description |
|---------|------------|-------------|
| User Profile | 0 (NIP-01) | Name, avatar, bio |
| Chat Message | 9 (NIP-29) | Encrypted team messages |
| Message Deletion | 5 (NIP-09) | Delete request |
| Workspace Invite | 30003 (Custom) | Invite link/code |
| Add Member | 30004 (Custom) | Accept invite |
| Key Revocation | 30005 (Custom) | Revoke message encryption |
| Kick User | 30006 (Custom) | Remove user from workspace |
| Member List | 30007 (Custom) | Current workspace members |

---

## Core Functionality Implementation

### 1. Inviting Users

**Flow:**
1. Admin creates invite event (kind: 30003)
2. Generate unique invite code
3. Publish to public relay
4. Share link: `yourapp.com/invite/{code}`

**Event Structure:**
```typescript
{
  kind: 30003,
  content: encrypt({
    workspaceId: 'workspace-123',
    workspaceName: 'Acme Corp',
    invitedBy: adminPubkey,
    expiresAt: timestamp
  }),
  tags: [
    ["d", "invite-{code}"],
    ["workspace", workspaceId]
  ]
}
```

**Implementation:** `lib/nostr/invites.ts`

---

### 2. Accepting Invites

**Flow:**
1. User clicks invite link
2. Fetch invite event from relay
3. Create member event (kind: 30004)
4. User receives encryption keys for NEW messages only
5. **Cannot decrypt old messages** (privacy feature)

**Event Structure:**
```typescript
{
  kind: 30004,
  content: '',
  tags: [
    ["d", "workspace-{id}-member-{pubkey}"],
    ["workspace", workspaceId],
    ["p", userPubkey],
    ["role", "member"]
  ]
}
```

**Implementation:** `lib/nostr/invites.ts`

---

### 3. Sending Messages (Encrypted)

**Flow:**
1. Generate ephemeral encryption key per message
2. Encrypt message content with key
3. Encrypt key separately for each workspace member
4. Publish encrypted message to relay
5. Store plaintext in local IndexedDB (instant UI)

**Event Structure:**
```typescript
{
  kind: 9,
  content: encryptedContent,
  tags: [
    ["h", channelId],
    ["key", memberPubkey1, encryptedKey1],
    ["key", memberPubkey2, encryptedKey2],
    // ... one per member
  ]
}
```

**Encryption Details:**
- Each message has unique encryption key
- Key encrypted to each member's public key
- Only current members can decrypt
- Old members cannot decrypt new messages

**Implementation:** `lib/nostr/messages.ts`

---

### 4. Deleting Messages

**Flow:**
1. User publishes deletion event (NIP-09)
2. Publish key revocation event
3. Delete from local IndexedDB
4. Other clients see deletion → hide message
5. Encrypted blob remains on relay (unreadable)

**Event Structures:**
```typescript
// Deletion request
{
  kind: 5,
  tags: [["e", messageId]]
}

// Key revocation
{
  kind: 30005,
  content: '',
  tags: [
    ["d", "revoke-{messageId}"],
    ["e", messageId],
    ["action", "revoke"]
  ]
}
```

**Client-Side Filtering:**
```typescript
// Hide deleted messages
messages.filter(msg => !deletionEvents.has(msg.id))
```

**Implementation:** `lib/nostr/messages.ts`

---

### 5. Kicking Users (Admin Only)

**Flow:**
1. Admin publishes kick event (kind: 30006)
2. Update workspace member list (remove user)
3. Publish new member list (kind: 30007)
4. Future messages encrypted WITHOUT kicked user
5. Kicked user cannot decrypt new messages

**Event Structures:**
```typescript
// Kick event
{
  kind: 30006,
  content: JSON.stringify({
    reason: 'Violated terms',
    kickedAt: Date.now()
  }),
  tags: [
    ["d", "workspace-{id}-kick-{pubkey}"],
    ["workspace", workspaceId],
    ["p", userPubkey],
    ["action", "kick"]
  ]
}

// Updated member list
{
  kind: 30007,
  content: JSON.stringify([member1, member2]),
  tags: [["d", "workspace-{id}-members"]]
}
```

**Enforcement:**
- **Cryptographic:** Kicked user not in encryption list
- **Client-Side:** App checks kick events, blocks sending

**Implementation:** `lib/nostr/permissions.ts`

---

## Security Model

### What This Architecture DOES Protect:

✅ **Privacy:** Messages encrypted end-to-end
✅ **Access Control:** Only members can decrypt messages
✅ **Kick Enforcement:** Kicked users can't read NEW messages
✅ **Deletion:** Messages become unreadable (keys revoked)
✅ **Decentralization:** No single point of failure
✅ **Zero Infrastructure:** Uses public relays (free)

### Limitations (Same as Signal/WhatsApp):

⚠️ **Old Messages:** Kicked users retain access to messages they saw
⚠️ **Screenshots:** Users can save content before deletion
⚠️ **Client Fork:** Bad actors can modify client code
⚠️ **Relay Storage:** Encrypted blobs remain on relays

### Comparison to Alternatives:

| Feature | This App | Slack | Self-Hosted Relay |
|---------|----------|-------|-------------------|
| E2E Encryption | ✅ | ❌ | ⚠️ Optional |
| Delete Works | ⚠️ Keys revoked | ✅ Server deletes | ✅ Server deletes |
| Kick Works | ✅ Can't decrypt | ✅ Blocked | ✅ Blocked |
| Cost | 💰 Free | 💰💰 $8/user/mo | 💰 $10-20/mo |
| Decentralized | ✅ | ❌ | ⚠️ Your server |

---

## Performance Optimizations

### 1. Local-First Architecture
- All data in IndexedDB (instant reads)
- Nostr relays for sync only
- Offline-capable

### 2. React Compiler
- Automatic memoization
- Zero manual `useMemo`/`useCallback`
- 60+ FPS rendering

### 3. Instant Navigation
- No Next.js routing for channel switching
- Pure Zustand state changes
- Zero network requests

### 4. Efficient Subscriptions
- `useLiveQuery` for reactive IndexedDB
- NDK handles relay pooling
- Automatic deduplication

### 5. Smart Prefetching
- Mouse-down navigation (faster than onClick)
- Keyboard shortcuts (⌘1-9 for channels)

---

## Relay Strategy

### Public Relays Used (Free):
- `wss://nos.lol`
- `wss://relay.damus.io`
- `wss://relay.nostr.band`

### Why No Self-Hosting (Now):
- Zero infrastructure costs
- Faster MVP development
- Encryption makes relay untrusted
- Can add later if needed

### Future Upgrade Path:
1. **Phase 1 (Now):** Public relays only
2. **Phase 2 (6mo):** Optional relay upgrade ($10/mo)
3. **Phase 3 (1yr):** Enterprise self-hosting

---

## User Flows

### Complete Scenario Example:

**Day 1: Workspace Creation**
```
Alice creates "Acme Corp"
├─ Generates invite code
└─ Shares: yourapp.com/invite/xyz
```

**Day 2: Team Joins**
```
Bob accepts invite → Added to members
Carol accepts invite → Added to members
├─ Both receive encryption keys
└─ Cannot see Day 1 messages (different keys)
```

**Day 3: Team Chats**
```
Bob: "Hey team!" (encrypted to [Alice, Bob, Carol])
Carol: "Hi Bob!" (encrypted to [Alice, Bob, Carol])
Alice: "Welcome!" (encrypted to [Alice, Bob, Carol])
```

**Day 4: Message Deletion**
```
Carol deletes "Hi Bob!"
├─ Deletion event published
├─ Key revocation published
├─ All clients hide message
└─ Encrypted blob remains (unreadable)
```

**Day 5: User Kicked**
```
Alice kicks Bob
├─ Kick event published
├─ New member list: [Alice, Carol]
├─ Bob can read messages from Day 3 (was member)
└─ Bob CANNOT decrypt future messages
```

**Day 6: Post-Kick Messages**
```
Alice: "Let's plan" (encrypted to [Alice, Carol])
Carol: "Sounds good!" (encrypted to [Alice, Carol])
└─ Bob sees encrypted blobs (cannot decrypt)
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)
- [x] Next.js + TypeScript setup
- [x] Dexie IndexedDB schema
- [x] NDK initialization
- [x] Zustand stores (UI + Chat)
- [x] React Compiler enabled

### Phase 2: UI/UX (Week 1-2)
- [x] Collapsible sidebar
- [x] Channel navigation (instant)
- [x] Keyboard shortcuts (⌘B, ⌘1-9)
- [ ] Message list component
- [ ] Message input component

### Phase 3: Nostr Integration (Week 2-3)
- [ ] Workspace creation
- [ ] Invite generation/acceptance
- [ ] Encrypted messaging
- [ ] Message deletion
- [ ] User kick functionality

### Phase 4: Authentication (Week 3)
- [ ] NIP-07 browser extension support
- [ ] User profile management
- [ ] Relay list (NIP-65)

### Phase 5: Polish (Week 4)
- [ ] Loading states
- [ ] Error handling
- [ ] Offline support
- [ ] Notifications
- [ ] PWA setup

---

## File Structure

```
/app
  /workspace/[workspaceId]/channel/[channelId]
    page.tsx              # Channel view (SPA-style)
  layout.tsx              # Root layout
  page.tsx                # Home/workspace switcher

/components
  /chat
    ChannelView.tsx       # Main chat UI
    MessageList.tsx       # Message rendering
    MessageInput.tsx      # Send messages
  /layout
    AppLayout.tsx         # Main layout wrapper
    Sidebar.tsx           # Channel list
    ChannelLink.tsx       # Individual channel item

/lib
  /db
    schema.ts             # Dexie schema
  /nostr
    /ndk.ts               # NDK initialization
    /invites.ts           # Invite creation/acceptance
    /messages.ts          # Send/delete messages
    /permissions.ts       # Kick/admin logic
    /encryption.ts        # E2E encryption layer
  /hooks
    use-channels.ts       # Reactive channel queries
    use-messages.ts       # Reactive message queries
    use-permissions.ts    # Check admin/member status
  /stores
    ui-store.ts           # Sidebar state
    chat-store.ts         # Current channel/workspace

/types
  nostr.ts                # Nostr event types
```

---

## Environment Variables

```env
# Nostr Relays (Public - no auth needed)
NEXT_PUBLIC_DEFAULT_RELAYS=wss://nos.lol,wss://relay.damus.io

# App Config
NEXT_PUBLIC_APP_NAME=Nostr Team Chat
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)

# Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript checking
```

---

## Deployment

### Vercel (Recommended)
```bash
vercel deploy --prod
```

### Static Export (IPFS/Cloudflare Pages)
```bash
npm run build
# Deploy /out folder
```

---

## Future Enhancements

### V2 (3-6 months):
- [ ] Voice/Video calls (WebRTC)
- [ ] File sharing (NIP-94 + Blossom)
- [ ] Search (local IndexedDB)
- [ ] Threads (nested conversations)
- [ ] Rich text editor
- [ ] Mobile apps (React Native)

### V3 (6-12 months):
- [ ] Optional relay hosting
- [ ] Enterprise self-hosting
- [ ] Advanced admin panel
- [ ] Analytics dashboard
- [ ] Integrations (GitHub, etc.)

---

## Key Design Decisions

### Why Client-Side Enforcement?
- ✅ Zero infrastructure costs
- ✅ Fully decentralized
- ✅ Fast MVP development
- ⚠️ Requires trust in client

### Why Encryption?
- ✅ True privacy (relay can't read)
- ✅ Enforces access control
- ✅ Kick/delete work cryptographically
- ⚠️ Adds complexity

### Why No Self-Hosted Relay (Yet)?
- ✅ Validates market first
- ✅ Public relays work fine
- ✅ Can add later if needed
- ⚠️ Less control over deletions

### Why Local-First?
- ✅ Instant UI (no loading)
- ✅ Offline support
- ✅ Better UX than server-first
- ✅ Reduces relay dependency

---

## Resources

- [Nostr NIPs](https://github.com/nostr-protocol/nips)
- [NDK Documentation](https://github.com/nostr-dev-kit/ndk)
- [Dexie.js Docs](https://dexie.org/)
- [NIP-29 Groups Spec](https://github.com/nostr-protocol/nips/blob/master/29.md)

---

**Last Updated:** 2025-10-16
**Version:** 1.0.0
**Status:** Active Development
