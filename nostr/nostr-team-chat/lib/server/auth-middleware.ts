import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from './session-store';

export async function requireAuth(request: NextRequest): Promise<NextResponse | { pubkey: string }> {
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'Unauthorized - No session cookie' },
      { status: 401 }
    );
  }

  const session = sessionStore.getSession(sessionCookie.value);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or expired session' },
      { status: 401 }
    );
  }

  return { pubkey: session.pubkey };
}

export function withAuth(
  handler: (request: NextRequest, context: { pubkey: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(request, authResult);
  };
}
