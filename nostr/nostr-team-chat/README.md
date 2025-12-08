# Mesh

A decentralized team collaboration app built on the Nostr protocol, implementing [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) for group communication.

## Features

- 🔐 **Decentralized Authentication** - Sign in with Nostr keys (NIP-07 extensions)
- 💬 **Group Chat** - Real-time messaging using NIP-29 relay groups
- 👥 **Team Workspaces** - Organize conversations by teams and channels
- 🌐 **Censorship Resistant** - No central authority controls your data
- 🔒 **Privacy First** - End-to-end encryption support

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Protocol**: Nostr (NIP-07, NIP-29)
- **State Management**: Zustand
- **UI Components**: Radix UI, shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- A Nostr key (browser extension like Alby or nos2x recommended)
- Access to a NIP-29 relay

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure your relay URL in .env.local
# NEXT_PUBLIC_NIP29_RELAY_URL=wss://your-relay.com

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_NIP29_RELAY_URL` | Yes | WebSocket URL of your NIP-29 relay |
| `NEXT_PUBLIC_APP_NAME` | No | App display name (default: "Mesh") |
| `NEXT_PUBLIC_APP_URL` | No | Public URL for SEO/sharing |

## Project Structure

```
app/                 # Next.js App Router pages
components/          # React components
  ├── chat/         # Chat-related components
  ├── landing/      # Landing page
  ├── sheets/       # Modal sheets
  └── ui/           # Base UI components
lib/                 # Utilities and hooks
  ├── hooks/        # Custom React hooks
  ├── nostr/        # Nostr protocol utilities
  ├── stores/       # Zustand stores
  └── utils/        # Helper functions
types/               # TypeScript definitions
```

## Related

- [Groups Relay](../groups_relay) - The NIP-29 relay that powers Mesh
- [NIP-29 Specification](https://github.com/nostr-protocol/nips/blob/master/29.md)

## License

MIT - See [LICENSE](../LICENSE) in the repository root.
