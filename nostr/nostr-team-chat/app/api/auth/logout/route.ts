import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionStore } from '@/lib/server/session-store';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (sessionCookie) {
      sessionStore.deleteSession(sessionCookie.value);
      console.log('🔴 Session deleted:', sessionCookie.value);
    }

    const response = NextResponse.json({ success: true });

    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
