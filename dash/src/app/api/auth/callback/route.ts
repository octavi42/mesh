import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract parameters from OAuth callback
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const connectionId = searchParams.get('connection_id');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth Error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/error?type=oauth&error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
    );
  }

  // Success callback - close popup and return to parent
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorization Complete</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .checkmark {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #4ade80;
        }
        h1 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        p {
          margin: 0;
          opacity: 0.8;
        }
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 3px solid #4ade80;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-left: 0.5rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkmark">✓</div>
        <h1>Authorization Complete</h1>
        <p>Closing window and completing connection<span class="spinner"></span></p>
      </div>
      
      <script>
        // Send message to parent window if it exists
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_callback',
            success: ${!error},
            code: '${code || ''}',
            state: '${state || ''}',
            connectionId: '${connectionId || ''}',
            error: '${error || ''}',
            errorDescription: '${errorDescription || ''}'
          }, '*');
        }
        
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
        
        // Fallback: redirect to main page if window doesn't close
        setTimeout(() => {
          if (window.opener) {
            window.location.href = '/';
          }
        }, 5000);
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'COMPOSIO_API_KEY not configured' }, { status: 500 });
    }
    const authService = getAuthService(apiKey);

    // Handle different callback types
    switch (body.type) {
      case 'check_connection':
        {
          const { connectionId } = body;
          if (!connectionId) {
            return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
          }

          try {
            const connection = await authService.getConnectionStatus(connectionId);
            return NextResponse.json({ connection });
          } catch (error) {
            return NextResponse.json(
              { error: 'Failed to check connection status', details: error instanceof Error ? error.message : 'Unknown error' },
              { status: 500 }
            );
          }
        }

      case 'wait_for_connection':
        {
          const { connectionId, maxAttempts = 10, interval = 2000 } = body;
          if (!connectionId) {
            return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
          }

          try {
            const connection = await authService.waitForConnection(
              connectionId,
              maxAttempts,
              interval
            );
            return NextResponse.json({ connection });
          } catch (error) {
            return NextResponse.json(
              { error: 'Connection timeout or failed', details: error instanceof Error ? error.message : 'Unknown error' },
              { status: 408 }
            );
          }
        }

      default:
        return NextResponse.json({ error: 'Invalid callback type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Callback API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}