// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Pas de token et essaie d'accéder à une page protégée
  if (!token && !pathname.startsWith('/login') && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. A un token et essaie de retourner sur la page de login
  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url)); // Renvoie vers l'hôtesse d'accueil
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};