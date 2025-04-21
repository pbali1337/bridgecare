import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the URL pathname
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/email-confirmation'];
  
  // Redirect rules
  if (session) {
    // User is logged in
    if (publicRoutes.includes(pathname)) {
      // If trying to access login page or other public routes, redirect to dashboard
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } else {
    // User is not logged in
    if (!publicRoutes.includes(pathname) && !pathname.includes('/_next') && !pathname.includes('.')) {
      // If trying to access protected routes, redirect to login page
      // Exclude Next.js static files and API routes
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  return res;
}

// Add a matcher configuration to specify which paths the middleware should run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 