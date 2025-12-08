# Contributing to Mesh

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/teamai.git
   cd teamai
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/octavi42/teamai.git
   ```
4. **Set up the project** following the README instructions

## Development Workflow

### Branching Strategy

- `main` - Stable production code
- `production` - Current production deployment
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, focused commits
2. Write clear commit messages:
   ```
   feat: add user authentication flow
   
   - Implement login/logout functionality
   - Add session management
   - Update UI components
   ```
3. Test your changes locally
4. Ensure no sensitive data (API keys, passwords) is committed

## Pull Request Process

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what was changed and why
   - Reference to any related issues
   - Screenshots for UI changes

4. **Address review feedback** by pushing additional commits

5. **Wait for approval** from maintainers

## Coding Standards

### TypeScript/JavaScript (Chat App)

- Use TypeScript for type safety
- Follow existing code style (ESLint configuration)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### React/Next.js

- Use functional components with hooks
- Keep components small and focused
- Use proper prop typing
- Follow the existing file structure

### Rust (Groups Relay)

- Follow Rust conventions and idioms
- Use `cargo fmt` for formatting
- Run `cargo clippy` for linting
- Add tests for new functionality

### General

- Never commit sensitive data (API keys, secrets, passwords)
- Use environment variables for configuration
- Update documentation when adding features
- Write tests for critical functionality

## Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - How to reproduce the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, browser, Node.js version, etc.
6. **Screenshots** - If applicable

Use the GitHub Issues feature with the "bug" label.

## Requesting Features

For feature requests, please:

1. Check if the feature already exists or is planned
2. Describe the feature and its use case
3. Explain why it would benefit the project
4. Consider if you'd like to implement it yourself

Use the GitHub Issues feature with the "enhancement" label.

## Project-Specific Guidelines

### Chat App (`nostr/nostr-team-chat/`)
- Follow NIP-29 specification for group features
- Test with multiple Nostr clients for compatibility
- Handle WebSocket reconnection gracefully
- Support both NIP-07 browser extensions and direct key input

### Groups Relay (`nostr/groups_relay/`)
- Ensure NIP compliance for all implemented NIPs
- Add comprehensive tests for event validation
- Document any protocol extensions
- Consider performance implications for relay operations

## Questions?

If you have questions, feel free to:
- Open a GitHub Discussion
- Check existing issues and discussions
- Reach out to maintainers

Thank you for contributing! 🎉
