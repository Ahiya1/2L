import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Tighten CSP for iframe content routes (student preview)
  if (request.nextUrl.pathname.startsWith('/api/preview/')) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // Allow Plotly CDN (trusted library for statistical visualizations)
        // Note: unsafe-eval needed for Plotly to work properly
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' data:",  // Plotly uses data URLs for styles
        "img-src 'self' data: blob:",  // Plotly may use blob URLs for images
        "connect-src 'self'",
        "frame-ancestors 'self'",  // Allow same-origin iframes (our project viewer)
      ].join('; ')
    )
  } else {
    // Standard CSP for admin panel and other routes
    // Note: unsafe-eval is needed in development for Next.js React Refresh
    const isDev = process.env.NODE_ENV === 'development'
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'"

    response.headers.set(
      'Content-Security-Policy',
      `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline';`
    )
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 301)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
