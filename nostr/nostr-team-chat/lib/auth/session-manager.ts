import type { NostrSession, AuthResult } from './types';
import { AuthService } from './auth-service';

export class SessionManager {
  private static instance: SessionManager;
  private verificationInterval: NodeJS.Timeout | null = null;
  private readonly VERIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  startSessionMonitoring(session: NostrSession, onSessionInvalid: () => void): void {
    this.stopSessionMonitoring();

    this.verificationInterval = setInterval(async () => {
      const isValid = await this.validateSession(session);
      if (!isValid) {
        console.warn('Session validation failed, marking as invalid');
        onSessionInvalid();
      }
    }, this.VERIFICATION_INTERVAL);
  }

  stopSessionMonitoring(): void {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
      this.verificationInterval = null;
    }
  }

  async validateSession(session: NostrSession): Promise<boolean> {
    // Check if session is expired
    if (this.isSessionExpired(session)) {
      console.warn('Session expired based on timeout');
      return false;
    }

    // Verify with auth service
    const authService = AuthService.getInstance();
    const result = await authService.verifySession(session);

    return result.success;
  }

  async refreshSession(session: NostrSession): Promise<AuthResult> {
    const authService = AuthService.getInstance();
    return await authService.verifySession(session);
  }

  isSessionExpired(session: NostrSession): boolean {
    const now = Date.now();
    const sessionAge = now - session.createdAt;
    const timeSinceLastVerification = now - session.lastVerifiedAt;

    // Session is expired if:
    // 1. It's older than SESSION_TIMEOUT
    // 2. It hasn't been verified recently (2x verification interval)
    return (
      sessionAge > this.SESSION_TIMEOUT ||
      timeSinceLastVerification > this.VERIFICATION_INTERVAL * 2
    );
  }

  shouldRefreshSession(session: NostrSession): boolean {
    const now = Date.now();
    const timeSinceLastVerification = now - session.lastVerifiedAt;

    // Refresh if last verification was more than half the verification interval ago
    return timeSinceLastVerification > this.VERIFICATION_INTERVAL / 2;
  }

  serializeSession(session: NostrSession): string {
    return JSON.stringify({
      ...session,
      // Don't serialize sensitive data
    });
  }

  deserializeSession(data: string): NostrSession | null {
    try {
      const session = JSON.parse(data) as NostrSession;

      // Validate required fields
      if (!session.pubkey || !session.authMethod || !session.createdAt) {
        console.warn('Invalid session data during deserialization');
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to deserialize session:', error);
      return null;
    }
  }

  createSessionCheckpoint(session: NostrSession): NostrSession {
    return {
      ...session,
      lastVerifiedAt: Date.now(),
    };
  }
}