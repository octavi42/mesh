interface Challenge {
  challenge: string;
  expiresAt: number;
  used: boolean;
}

interface Session {
  pubkey: string;
  createdAt: number;
  expiresAt: number;
}

class SessionStore {
  private challenges: Map<string, Challenge> = new Map();
  private sessions: Map<string, Session> = new Map();

  createChallenge(challengeId: string, challenge: string): Challenge {
    const challengeData: Challenge = {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
      used: false,
    };
    this.challenges.set(challengeId, challengeData);

    setTimeout(() => {
      this.challenges.delete(challengeId);
    }, 5 * 60 * 1000);

    return challengeData;
  }

  getChallenge(challengeId: string): Challenge | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;
    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return null;
    }
    return challenge;
  }

  markChallengeUsed(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    if (challenge) {
      challenge.used = true;
      this.challenges.set(challengeId, challenge);
    }
  }

  createSession(sessionId: string, pubkey: string): Session {
    const sessionData: Session = {
      pubkey,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };
    this.sessions.set(sessionId, sessionData);

    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 3600000);

    return sessionData;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  cleanup(): void {
    const now = Date.now();

    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
      }
    }

    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();

setInterval(() => {
  sessionStore.cleanup();
}, 60000);
