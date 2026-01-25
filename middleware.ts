import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware that runs on ALL API requests
 * - Handles CORS (Cross-Origin Resource Sharing)
 * - Sets security headers (helmet equivalent)
 * - Handles preflight OPTIONS requests
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Create response that continues to API route
  const response = NextResponse.next();

  // ============================================
  // CORS HEADERS
  // ============================================

  // Production: Whitelist specific domains
  const allowedOrigins = [
    'https://leabharlann.uisneac.com',
    'https://leabharlann-14f36k4st-oisins-projects-9404c75a.vercel.app/',
    process.env.NEXT_PUBLIC_APP_URL,
    'localhost',
  ].filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // CORS: Allowed HTTP methods
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  
  // CORS: Allowed request headers
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  
  // CORS: Expose headers to client
  response.headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, X-Request-Id'
  );
  
  // CORS: Cache preflight response for 24 hours
  response.headers.set('Access-Control-Max-Age', '86400');

  // ============================================
  // SECURITY HEADERS (Helmet equivalent)
  // ============================================
  
  // Prevent DNS prefetching
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  
  // Prevent page from being displayed in iframe (clickjacking protection)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Control how much referrer information is sent
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enable browser XSS protection (legacy, but doesn't hurt)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy (CSP)
  // This is a strict policy - adjust based on your needs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts (Next.js needs this)
    "style-src 'self' 'unsafe-inline'", // Allow inline styles
    "img-src 'self' data: https:", // Allow images from HTTPS and data URIs
    "font-src 'self' data:",
    "connect-src 'self'", // API calls only to same origin
    "frame-ancestors 'self'", // Can only be framed by same origin
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );
  
  // Permissions Policy (formerly Feature-Policy)
  // Disable features you don't need
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // ============================================
  // HANDLE PREFLIGHT OPTIONS REQUEST
  // ============================================
  
  // OPTIONS requests are preflight checks by browsers
  // Return immediately without hitting API routes
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // ============================================
  // ADDITIONAL CUSTOM HEADERS
  // ============================================
  
  // Add request ID for tracking (useful for debugging)
  response.headers.set('X-Request-Id', crypto.randomUUID());
  
  // Add server information (optional - some prefer to hide this)
  // response.headers.set('X-Powered-By', 'Leabharlann API');

  // Continue to API route with all headers set
  return response;
}

// ============================================
// MATCHER CONFIG
// ============================================

/**
 * Configure which routes this middleware runs on
 * Currently set to run on ALL /api routes
 */
export const config = {
  matcher: '/api/:path*',
};
