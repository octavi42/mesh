# TeamAI

A modular workspace for team collaboration tools, integrations, and Nostr-based communication.

## 🏗️ Project Structure

This monorepo contains multiple applications:

| Directory | Description | Tech Stack |
|-----------|-------------|------------|
| `ui/` | Main team collaboration UI with chat, projects, and user management | Next.js, Supabase, TypeScript |
| `dash/` | Integration dashboard with Composio for connecting third-party services | Next.js, Composio API, TypeScript |
| `mcp-dashboard/` | MCP (Model Context Protocol) dashboard | Next.js, TypeScript |
| `nostr/` | Nostr-based decentralized team chat and relay | Rust, Next.js |

### Nostr Subprojects

| Directory | Description |
|-----------|-------------|
| `nostr/groups_relay/` | NIP-29 compliant groups relay server (Rust) |
| `nostr/nostr-team-chat/` | Nostr-based team chat application |
| `nostr/nostr-login-test/` | Nostr authentication testing |
| `nostr/silk-main/` | Silk library examples |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Rust toolchain for the relay
- (Optional) Docker for containerized deployments

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/octavi42/teamai.git
   cd teamai
   ```

2. **Choose a project and set up environment variables**

   Each project has its own `.env.example` file. Copy it to `.env.local`:
   ```bash
   # For the main UI
   cd ui
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   
   # For the integration dashboard
   cd ../dash
   cp .env.example .env.local
   # Edit .env.local with your Composio API key
   ```

3. **Install dependencies and run**
   ```bash
   npm install
   npm run dev
   ```

## 📦 Individual Project Setup

### UI (Main Application)

The main team collaboration interface with:
- Real-time chat
- Project management
- User authentication via Supabase

```bash
cd ui
cp .env.example .env.local
# Add your Supabase credentials
npm install
npm run dev
```

See [ui/SUPABASE_SETUP.md](ui/SUPABASE_SETUP.md) for detailed Supabase configuration.

### Dashboard (Composio Integrations)

Integration dashboard for connecting third-party services:

```bash
cd dash
cp .env.example .env.local
# Add your Composio API key from https://app.composio.dev/
npm install
npm run dev
```

See [dash/COMPOSIO_SETUP.md](dash/COMPOSIO_SETUP.md) for setup details.

### Nostr Team Chat

Decentralized team chat using Nostr protocol:

```bash
cd nostr/nostr-team-chat
cp .env.example .env.local
npm install
npm run dev
```

### Groups Relay (Rust)

NIP-29 compliant Nostr relay:

```bash
cd nostr/groups_relay
cargo build --release
cargo run
```

See [nostr/groups_relay/README.md](nostr/groups_relay/README.md) for configuration.

## 🔐 Environment Variables

Each project requires specific environment variables. See the `.env.example` files in each directory:

- `ui/.env.example` - Supabase configuration
- `dash/.env.example` - Composio API configuration
- `nostr/nostr-team-chat/.env.example` - Nostr relay configuration

**⚠️ Never commit `.env.local` files with real credentials!**

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note:** The `nostr/groups_relay` subproject is licensed under AGPL-3.0.

## 🔗 Links

- [Supabase](https://supabase.com) - Backend for the main UI
- [Composio](https://composio.dev) - Integration platform for the dashboard
- [Nostr Protocol](https://nostr.com) - Decentralized social protocol
