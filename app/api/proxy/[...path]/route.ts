import { NextRequest, NextResponse } from 'next/server';

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001';

async function proxyRequest(req: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  const { path } = await paramsPromise;
  const backendUrl = `${BACKEND_ORIGIN}/api/${path.join('/')}${req.nextUrl.search}`;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('host');
  requestHeaders.delete('x-forwarded-proto');
  requestHeaders.delete('x-forwarded-host');
  requestHeaders.set('cookie', req.headers.get('cookie') ?? '');

  const init: RequestInit = {
    method: req.method,
    headers: requestHeaders,
    redirect: 'follow',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const backendRes = await fetch(backendUrl, init);
  const responseBody = await backendRes.arrayBuffer();

  const responseHeaders = new Headers(backendRes.headers);

  // Extract cookies using standard Web API getSetCookie if available
  let setCookieHeaders: string[] = [];
  if (typeof backendRes.headers.getSetCookie === 'function') {
    setCookieHeaders = backendRes.headers.getSetCookie();
  } else {
    const rawHeaders = (backendRes.headers as any).raw?.() ?? {};
    setCookieHeaders = rawHeaders['set-cookie'] ?? [];
  }

  // Remove existing set-cookie from responseHeaders to control the exact values sent back
  responseHeaders.delete('set-cookie');
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  const response = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  });

  if (Array.isArray(setCookieHeaders) && setCookieHeaders.length > 0) {
    for (let cookie of setCookieHeaders) {
      // Normalize cookie for local dev: browsers reject 'SameSite=None' without 'Secure'.
      // If cookie contains 'SameSite=None' but not 'Secure', downgrade SameSite to Lax.
      try {
        const hasSameSiteNone = /;?\s*SameSite=None/i.test(cookie);
        const hasSecure = /;?\s*Secure/i.test(cookie);
        if (hasSameSiteNone && !hasSecure) {
          cookie = cookie.replace(/;?\s*SameSite=None/i, '; SameSite=Lax');
        }
      } catch (e) {
        // ignore transformation failures, forward original cookie
      }

      response.headers.append('set-cookie', cookie);
    }
  }

  return response;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
