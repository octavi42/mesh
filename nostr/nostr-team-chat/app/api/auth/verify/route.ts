import { NextResponse } from 'next/server';
import { verifyEvent } from 'nostr-tools/pure';
import { sessionStore } from '@/lib/server/session-store';
import type { NostrAuthEvent } from '@/lib/auth/nostr-auth';

export async function POST(request: Request) {
  try {
    const { challengeId, signedEvent } = await request.json() as {
      challengeId: string;
      signedEvent: NostrAuthEvent;
    };

    console.log('🔐 Verifying auth event:', { challengeId, pubkey: signedEvent.pubkey });

    const challengeData = sessionStore.getChallenge(challengeId);
    if (!challengeData) {
      console.error('❌ Challenge not found or expired');
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 401 }
      );
    }

    if (challengeData.used) {
      console.error('❌ Challenge already used');
      return NextResponse.json(
        { error: 'Challenge already used' },
        { status: 401 }
      );
    }

    if (Date.now() > challengeData.expiresAt) {
      console.error('❌ Challenge expired');
      return NextResponse.json(
        { error: 'Challenge expired' },
        { status: 401 }
      );
    }

    const isVerified = verifyEvent(signedEvent);
    if (!isVerified) {
      console.error('❌ Invalid signature');
      return NextResponse.json(
        { error: 'Invalid event signature' },
        { status: 401 }
      );
    }

    if (signedEvent.kind !== 22242) {
      console.error('❌ Invalid event kind:', signedEvent.kind);
      return NextResponse.json(
        { error: 'Invalid event kind' },
        { status: 401 }
      );
    }

    const challengeTag = signedEvent.tags.find(([tag]) => tag === 'challenge');
    if (!challengeTag || challengeTag[1] !== challengeData.challenge) {
      console.error('❌ Challenge mismatch');
      return NextResponse.json(
        { error: 'Challenge mismatch' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const eventAge = Math.abs(now - signedEvent.created_at);
    if (eventAge > 60) {
      console.error('❌ Event timestamp too old:', eventAge);
      return NextResponse.json(
        { error: 'Event timestamp out of acceptable range' },
        { status: 401 }
      );
    }

    const origin = request.headers.get('origin') || '';
    if (origin) {
      const urlTag = signedEvent.tags.find(([tag]) => tag === 'url');
      if (urlTag && urlTag[1] !== origin) {
        console.error('❌ URL mismatch:', { expected: origin, got: urlTag[1] });
        return NextResponse.json(
          { error: 'URL mismatch' },
          { status: 401 }
        );
      }
    }

    sessionStore.markChallengeUsed(challengeId);

    const sessionId = crypto.randomUUID();
    const session = sessionStore.createSession(sessionId, signedEvent.pubkey);

    console.log('✅ Authentication successful:', { sessionId, pubkey: signedEvent.pubkey });

    const response = NextResponse.json({
      success: true,
      pubkey: signedEvent.pubkey,
      expiresAt: session.expiresAt,
    });

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
