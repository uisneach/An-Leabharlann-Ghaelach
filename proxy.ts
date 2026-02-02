// ============================================
// FILE: proxy.ts
// SIMPLE VERSION - Allow all CORS (development use only!)
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  const method = request.method;

  console.log(response);

  console.log(`🌐 CORS: ${method} ${request.nextUrl.pathname} from ${origin || 'same-origin'}`);

  // Allow all CORS - perfect for development
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  response.headers.set('Access-Control-Max-Age', '86400');

  console.log(response);

  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204, 
      headers: response.headers 
    });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
