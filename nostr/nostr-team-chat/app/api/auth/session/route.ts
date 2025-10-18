import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionStore } from '@/lib/server/session-store';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, error: 'No session cookie' },
        { status: 401 }
      );
    }

    const session = sessionStore.getSession(sessionCookie.value);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      pubkey: session.pubkey,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
