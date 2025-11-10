import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Block problematic service worker requests
  const pathname = request.nextUrl.pathname;
  
  // Block known problematic service workers
  if (pathname.endsWith('cnm-sw.js') || 
      pathname.endsWith('/sw.js') || 
      pathname.endsWith('/service-worker.js')) {
    console.warn(`[Middleware] Blocked service worker request: ${pathname}`);
    return new NextResponse('Service worker blocked', { status: 404 });
  }

  // Add security headers to prevent issues
  const response = NextResponse.next();
  
  // Add headers to help with debugging
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
