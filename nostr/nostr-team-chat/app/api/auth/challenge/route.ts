import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/server/session-store';

export async function POST() {
  try {
    const challengeId = crypto.randomUUID();
    const challenge = crypto.randomUUID();

    const challengeData = sessionStore.createChallenge(challengeId, challenge);

    console.log('🔑 Generated challenge:', { challengeId, challenge });

    return NextResponse.json({
      challengeId,
      challenge,
      expiresAt: challengeData.expiresAt,
    });
  } catch (error) {
    console.error('Failed to generate challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}
