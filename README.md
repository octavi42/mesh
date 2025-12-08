# Nostr Team Chat

A decentralized team communication platform built on the Nostr protocol. Features real-time group chat with NIP-29 compliant relay support.

## 🏗️ Project Structure

| Directory | Description | Tech Stack |
|-----------|-------------|------------|
| `nostr/nostr-team-chat/` | Team chat web application | Next.js, TypeScript, Nostr |
| `nostr/groups_relay/` | NIP-29 compliant groups relay server | Rust |

## ✨ Features

- **Decentralized**: Built on Nostr protocol - no central server required
- **NIP-29 Groups**: Full support for relay-based group chats
- **Real-time**: Instant message delivery via WebSocket
- **Self-hosted**: Run your own relay for complete data ownership
- **Privacy-focused**: Cryptographic identity with Nostr keys

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- (Optional) Rust toolchain for running your own relay
- (Optional) Docker for containerized relay deployment

### Running the Chat App

```bash
cd nostr/nostr-team-chat
cp .env.example .env.local
# Edit .env.local with your relay URL
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Running Your Own Relay

```bash
cd nostr/groups_relay

# With Cargo
cargo run

# Or with Docker
docker compose up --build
```

Relay UI available at `http://localhost:8080`

## 🔧 Configuration

### Chat App (`nostr/nostr-team-chat/.env.example`)

```bash
# Nostr Relay URL
NEXT_PUBLIC_NIP29_RELAY_URL=wss://groups.yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_NAME=Nostr Team Chat
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Relay (`nostr/groups_relay/`)

See [groups_relay/README.md](nostr/groups_relay/README.md) for detailed relay configuration.

## � Documentation

- [NIP-29 Specification](https://github.com/nostr-protocol/nips/blob/master/29.md) - Relay-based Groups
- [Nostr Protocol](https://nostr.com) - Learn about Nostr
- [Groups Relay Docs](nostr/groups_relay/README.md) - Relay setup and configuration

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

- **Chat App** (`nostr/nostr-team-chat/`): MIT License - see [LICENSE](LICENSE)
- **Groups Relay** (`nostr/groups_relay/`): AGPL-3.0 - see [nostr/groups_relay/LICENSE](nostr/groups_relay/LICENSE)

## 🔗 Links

- [Nostr Protocol](https://nostr.com) - Decentralized social protocol
- [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) - Groups specification
- [Awesome Nostr](https://github.com/aljazceru/awesome-nostr) - Nostr resources
