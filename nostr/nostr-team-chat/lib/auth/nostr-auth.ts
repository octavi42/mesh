import { verifyEvent, getEventHash, type UnsignedEvent } from 'nostr-tools/pure';

export interface NostrAuthEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface AuthChallenge {
  challenge: string;
  timestamp: number;
}

export class NostrAuth {
  private static readonly AUTH_KIND = 22242;
  private static readonly CHALLENGE_EXPIRY = 60000;

  static generateChallenge(): AuthChallenge {
    const challenge = crypto.randomUUID();
    const timestamp = Date.now();

    return { challenge, timestamp };
  }

  static isChallengeValid(challenge: AuthChallenge): boolean {
    const now = Date.now();
    const age = now - challenge.timestamp;

    return age < this.CHALLENGE_EXPIRY;
  }

  static async verifyAuthEvent(
    event: NostrAuthEvent,
    expectedChallenge: string,
    expectedUrl?: string
  ): Promise<{ valid: boolean; error?: string; pubkey?: string }> {
    try {
      const isVerified = verifyEvent(event);
      if (!isVerified) {
        return { valid: false, error: 'Invalid event or signature' };
      }

      if (event.kind !== this.AUTH_KIND) {
        return { valid: false, error: `Invalid event kind. Expected ${this.AUTH_KIND}, got ${event.kind}` };
      }

      const challengeTag = event.tags.find(([tag]) => tag === 'challenge');
      if (!challengeTag || challengeTag[1] !== expectedChallenge) {
        return { valid: false, error: 'Invalid or missing challenge' };
      }

      if (expectedUrl) {
        const urlTag = event.tags.find(([tag]) => tag === 'url');
        if (!urlTag || urlTag[1] !== expectedUrl) {
          return { valid: false, error: 'Invalid or missing URL tag' };
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const eventAge = now - event.created_at;
      if (eventAge > 60 || eventAge < -60) {
        return { valid: false, error: 'Event timestamp out of acceptable range (±60 seconds)' };
      }

      return { valid: true, pubkey: event.pubkey };
    } catch (error) {
      console.error('Auth verification error:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  static async createAuthEvent(
    challenge: string,
    url?: string
  ): Promise<NostrAuthEvent | null> {
    try {
      if (!window.nostr) {
        throw new Error('window.nostr not available');
      }

      const pubkey = await window.nostr.getPublicKey();

      const tags: string[][] = [
        ['challenge', challenge],
      ];

      if (url) {
        tags.push(['url', url]);
      }

      const event = {
        kind: this.AUTH_KIND,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: '',
      };

      const signedEvent = await window.nostr.signEvent(event);

      const computedId = getEventHash(signedEvent as UnsignedEvent);
      if (computedId !== signedEvent.id) {
        throw new Error('Event ID mismatch');
      }

      return signedEvent as NostrAuthEvent;
    } catch (error) {
      console.error('Failed to create auth event:', error);
      return null;
    }
  }

  static async verifyPubkeyOwnership(expectedPubkey: string): Promise<boolean> {
    try {
      if (!window.nostr) {
        return false;
      }

      const pubkey = await window.nostr.getPublicKey();
      return pubkey === expectedPubkey;
    } catch (error) {
      console.error('Failed to verify pubkey ownership:', error);
      return false;
    }
  }

  static async signMessage(message: string): Promise<string | null> {
    try {
      if (!window.nostr) {
        throw new Error('window.nostr not available');
      }

      const pubkey = await window.nostr.getPublicKey();

      const event = {
        kind: 1,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: message,
      };

      const signedEvent = await window.nostr.signEvent(event);
      return signedEvent.sig;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }
}

export interface SecureAuthSession {
  pubkey: string;
  challenge: string;
  verifiedAt: number;
  expiresAt: number;
}

export class SecureSessionManager {
  private static readonly SESSION_DURATION = 3600000;
  private static readonly STORAGE_KEY = 'nostr-secure-session';

  static createSession(pubkey: string, challenge: string): SecureAuthSession {
    const now = Date.now();
    const session: SecureAuthSession = {
      pubkey,
      challenge,
      verifiedAt: now,
      expiresAt: now + this.SESSION_DURATION,
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  static getSession(): SecureAuthSession | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      const session: SecureAuthSession = JSON.parse(data);

      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  static async validateSession(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return false;

    const ownsKey = await NostrAuth.verifyPubkeyOwnership(session.pubkey);
    if (!ownsKey) {
      this.clearSession();
      return false;
    }

    return true;
  }

  static clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
