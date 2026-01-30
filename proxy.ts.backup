// ============================================
// FILE: proxy.ts (at project root)
// ============================================
// Public read access, protected write access with debugging

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const { pathname, href } = request.nextUrl;
  const method = request.method;
  
  // ============================================
  // DEBUGGING - Logs appear in Vercel logs
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Edge Proxy Hit');
  console.log('Method:', method);
  console.log('Full URL:', href);
  console.log('Origin:', origin || '(no origin header)');
  console.log('User-Agent:', request.headers.get('user-agent'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const response = NextResponse.next();
  const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === 'development';

  // ============================================
  // CORS LOGIC
  // ============================================
  
  // Check if this is a user-related endpoint
  const isUserEndpoint = pathname.startsWith('/api/users/');
  
  // Check if this is a read-only request
  const isReadRequest = method === 'GET';
  
  // Production: Whitelist specific domains
  const allowedOrigins = [
    'https://leabharlann.uisneac.com',
    'https://leabharlann-14f36k4st-oisins-projects-9404c75a.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  // Development: Add localhost variants
  if (isDevelopment) {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }

  // RULE 1: Public READ access (except /api/users/)
  if (isReadRequest && !isUserEndpoint) {
    console.log('Public read access granted (GET request, not /api/users/)');
    response.headers.set('Access-Control-Allow-Origin', '*');
    // Note: Cannot use credentials with * wildcard
  }
  // RULE 2: Protected access (writes OR /api/users/)
  else {
    if (isUserEndpoint) {
      console.log('Protected endpoint: /api/users/');
    }
    if (!isReadRequest) {
      console.log('Protected method:', method);
    }
    
    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      console.log('Allowed origin, credentials enabled');
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      console.log('Origin not in allowlist:', origin);
      console.log('Allowed origins:', allowedOrigins);
      // Don't set CORS headers - browser will block the request
    }
  }
  
  // ============================================
  // CORS: Allowed HTTP methods
  // ============================================
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  
  // ============================================
  // CORS: Allowed request headers
  // ============================================
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  
  // ============================================
  // CORS: Expose headers to client
  // ============================================
  response.headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, X-Request-Id'
  );
  
  // ============================================
  // CORS: Cache preflight response
  // ============================================
  response.headers.set('Access-Control-Max-Age', '86400');

  // ============================================
  // SECURITY HEADERS (Helmet equivalent)
  // ============================================
  
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );
  
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // ============================================
  // HANDLE PREFLIGHT OPTIONS REQUEST
  // ============================================
  
  if (method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // ============================================
  // CUSTOM HEADERS
  // ============================================
  
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);
  console.log('Request ID:', requestId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return response;
}

// ============================================
// MATCHER CONFIG
// ============================================

export const config = {
  matcher: '/api/:path*',
};