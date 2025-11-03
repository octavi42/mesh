import type { AuthMethod, NostrSession, AuthResult, AuthError } from './types';
import { nip19 } from 'nostr-tools';

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async authenticateWithExtension(): Promise<AuthResult> {
    try {
      if (!window.nostr) {
        return this.createError('NO_EXTENSION', 'Browser extension not found', true, false);
      }

      const pubkey = await window.nostr.getPublicKey();

      if (!pubkey) {
        return this.createError('NO_PUBKEY', 'Failed to get public key from extension', true, true);
      }

      // Try to get user metadata
      let metadata = {};
      try {
        if (window.nostr.getPublicKey && window.nostr.signEvent) {
          // Extension is functional, we can try to get more info
          metadata = await this.fetchUserMetadata(pubkey);
        }
      } catch (error) {
        // Metadata fetch failed, but auth succeeded
        console.warn('Failed to fetch user metadata:', error);
      }

      const session: NostrSession = {
        pubkey,
        npub: nip19.npubEncode(pubkey),
        authMethod: 'extension',
        permissions: ['sign_event', 'encrypt', 'decrypt'],
        createdAt: Date.now(),
        lastVerifiedAt: Date.now(),
        metadata,
      };

      return { success: true, session };
    } catch (error) {
      console.error('Extension auth failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          return this.createError('USER_REJECTED', 'User rejected the connection request', true, true);
        }
        if (error.message.includes('locked')) {
          return this.createError('EXTENSION_LOCKED', 'Browser extension is locked', true, true);
        }
      }

      return this.createError('EXTENSION_ERROR', 'Extension authentication failed', true, true);
    }
  }

  async authenticateWithLocal(nsec: string): Promise<AuthResult> {
    try {
      if (!nsec.startsWith('nsec1')) {
        return this.createError('INVALID_NSEC', 'Invalid nsec format', false, false);
      }

      const { type, data } = nip19.decode(nsec);
      if (type !== 'nsec') {
        return this.createError('INVALID_NSEC', 'Invalid nsec type', false, false);
      }

      const privateKey = data as Uint8Array;
      const pubkey = this.getPublicKeyFromPrivate(privateKey);

      // Fetch user metadata
      let metadata = {};
      try {
        metadata = await this.fetchUserMetadata(pubkey);
      } catch (error) {
        console.warn('Failed to fetch user metadata:', error);
      }

      const session: NostrSession = {
        pubkey,
        npub: nip19.npubEncode(pubkey),
        authMethod: 'local',
        permissions: ['sign_event', 'encrypt', 'decrypt'],
        createdAt: Date.now(),
        lastVerifiedAt: Date.now(),
        metadata,
      };

      return { success: true, session };
    } catch (error) {
      console.error('Local auth failed:', error);
      return this.createError('LOCAL_AUTH_ERROR', 'Failed to authenticate with local key', true, false);
    }
  }

  async authenticateWithRemote(bunkerUrl: string): Promise<AuthResult> {
    try {
      // This would integrate with nostr-login or similar for remote signing
      // For now, returning a placeholder implementation

      return this.createError('NOT_IMPLEMENTED', 'Remote authentication not yet implemented', false, false);
    } catch (error) {
      console.error('Remote auth failed:', error);
      return this.createError('REMOTE_AUTH_ERROR', 'Remote authentication failed', true, true);
    }
  }

  async authenticateWithMobile(): Promise<AuthResult> {
    try {
      // This would handle mobile-specific auth flows (Amber, etc.)
      // For now, returning a placeholder implementation

      return this.createError('NOT_IMPLEMENTED', 'Mobile authentication not yet implemented', false, false);
    } catch (error) {
      console.error('Mobile auth failed:', error);
      return this.createError('MOBILE_AUTH_ERROR', 'Mobile authentication failed', true, true);
    }
  }

  async verifySession(session: NostrSession): Promise<AuthResult> {
    try {
      switch (session.authMethod) {
        case 'extension':
          return await this.verifyExtensionSession(session);
        case 'local':
          return await this.verifyLocalSession(session);
        case 'remote':
          return await this.verifyRemoteSession(session);
        case 'mobile':
          return await this.verifyMobileSession(session);
        default:
          return this.createError('UNKNOWN_METHOD', 'Unknown authentication method', false, false);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      return this.createError('VERIFICATION_ERROR', 'Session verification failed', true, true);
    }
  }

  private async verifyExtensionSession(session: NostrSession): Promise<AuthResult> {
    if (!window.nostr) {
      return this.createError('EXTENSION_DISCONNECTED', 'Browser extension disconnected', true, true);
    }

    try {
      const currentPubkey = await window.nostr.getPublicKey();
      if (currentPubkey !== session.pubkey) {
        return this.createError('SESSION_MISMATCH', 'Session pubkey mismatch', true, false);
      }

      // Update last verified time
      const updatedSession: NostrSession = {
        ...session,
        lastVerifiedAt: Date.now(),
      };

      return { success: true, session: updatedSession };
    } catch (error) {
      return this.createError('EXTENSION_ERROR', 'Extension verification failed', true, true);
    }
  }

  private async verifyLocalSession(session: NostrSession): Promise<AuthResult> {
    // Local sessions are always valid unless corrupted
    const updatedSession: NostrSession = {
      ...session,
      lastVerifiedAt: Date.now(),
    };
    return { success: true, session: updatedSession };
  }

  private async verifyRemoteSession(session: NostrSession): Promise<AuthResult> {
    // Would verify remote signer connection
    return this.createError('NOT_IMPLEMENTED', 'Remote session verification not implemented', false, false);
  }

  private async verifyMobileSession(session: NostrSession): Promise<AuthResult> {
    // Would verify mobile app connection
    return this.createError('NOT_IMPLEMENTED', 'Mobile session verification not implemented', false, false);
  }

  private async fetchUserMetadata(pubkey: string): Promise<object> {
    // This would fetch user metadata from relays
    // For now, return empty object
    return {};
  }

  private getPublicKeyFromPrivate(privateKey: Uint8Array): string {
    // This would derive public key from private key
    // Using nostr-tools or similar
    throw new Error('Not implemented');
  }

  private createError(code: string, message: string, recoverable: boolean, retryable: boolean): AuthResult {
    const error: AuthError = {
      code,
      message,
      recoverable,
      retryable,
    };
    return { success: false, error };
  }
}