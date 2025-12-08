import { NextRequest, NextResponse } from 'next/server';

const COMPOSIO_API_BASE = 'https://backend.composio.dev/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PATCH');
}

async function handleRequest(
  request: NextRequest, 
  params: { path: string[] }, 
  method: string
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'COMPOSIO_API_KEY not configured' }, { status: 500 });
    }
    
    // Reconstruct the API path
    const apiPath = params.path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const fullUrl = `${COMPOSIO_API_BASE}/${apiPath}${searchParams ? `?${searchParams}` : ''}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        console.log('No body to parse');
      }
    }

    // Make the API request
    const response = await fetch(fullUrl, requestOptions);
    
    // Get response data
    let data;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        // If it looks like JSON, try to parse it
        if (textData.trim().startsWith('{') || textData.trim().startsWith('[')) {
          try {
            data = JSON.parse(textData);
          } catch {
            data = textData;
          }
        } else {
          data = textData;
        }
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      data = { error: 'Failed to parse response', details: parseError };
    }

    // Log for debugging
    console.log('Composio API Response:', {
      url: fullUrl,
      status: response.status,
      contentType,
      dataType: typeof data,
      data: typeof data === 'string' ? data.substring(0, 500) : data,
      rawResponse: typeof data === 'string' && data.includes('<!DOCTYPE') ? data : undefined
    });

    // Return response with same status
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      }
    });

  } catch (error) {
    console.error('Composio API Proxy Error:', error);
    
    return NextResponse.json(
      { 
        error: 'API request failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined 
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        }
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}