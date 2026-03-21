import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const CABECERAS_SEGURIDAD: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "frame-src https://www.google.com",
    "font-src 'self'",
  ].join('; '),
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Aplicar cabeceras de seguridad a todas las rutas
  Object.entries(CABECERAS_SEGURIDAD).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Rate limiting solo en rutas API
  if (pathname.startsWith('/api/')) {
    const identifier = pathname.startsWith('/api/v1/')
      ? (request.headers.get('x-api-key') ?? request.headers.get('x-forwarded-for') ?? 'anon')
      : (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon');

    const { limited, retryAfter } = await checkRateLimit(identifier, pathname);

    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta más tarde.' } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter ?? 60),
            ...CABECERAS_SEGURIDAD,
          },
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
