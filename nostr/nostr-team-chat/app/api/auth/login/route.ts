import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/server/session-store';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const { pubkey, npub } = await request.json();

    if (!pubkey) {
      return NextResponse.json(
        { error: 'Missing pubkey' },
        { status: 400 }
      );
    }

    const sessionId = randomBytes(32).toString('hex');
    sessionStore.createSession(sessionId, pubkey);

    const response = NextResponse.json({
      success: true,
      pubkey,
      npub,
    });

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
