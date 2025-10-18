import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth-middleware';

export const GET = withAuth(async (request: NextRequest, { pubkey }) => {
  return NextResponse.json({
    pubkey,
    authenticated: true,
  });
});
