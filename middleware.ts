import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware for security headers and request logging
 */
export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS headers (customize based on your needs)
  // response.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
  // response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  // response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

// Apply middleware to all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
