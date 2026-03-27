import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = process.env.JWT_SECRET || 'secret_par_defaut_a_changer';
const secretKey = new TextEncoder().encode(SECRET);

interface JwtPayloadRole {
  libelle?: string;
  [key: string]: unknown;
}

interface CustomJwtPayload {
  role?: string | JwtPayloadRole;
  user?: {
    role?: string | JwtPayloadRole;
  };
  [key: string]: unknown;
}

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 🔥 L'ANTIDOTE : La route "Tue-Cookie"
  // Si on passe par /logout, le serveur détruit le cookie HttpOnly
  if (pathname === '/logout') {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  const isAuthPage = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register');
  
  if (!token) {
    if (!isAuthPage && pathname !== '/') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const typedPayload = payload as CustomJwtPayload;
    
    const userData = typedPayload.user || typedPayload;
    const rawRole = userData.role;
    
    let userRole = '';
    if (typeof rawRole === 'object' && rawRole !== null && 'libelle' in rawRole) {
        userRole = String(rawRole.libelle) || '';
    } else if (typeof rawRole === 'string') {
        userRole = rawRole;
    }
    
    userRole = userRole.toUpperCase().trim();

    if (isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const isAdminRoute = pathname.startsWith('/admin');
    const isChefRoute = pathname.startsWith('/chef');
    const isProfRoute = pathname.startsWith('/professeur');

    if (isAdminRoute && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isChefRoute && userRole !== 'CHEF_DEPARTEMENT' && userRole !== 'CHEF_ETABLISSEMENT') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/chef/validations') && userRole !== 'CHEF_ETABLISSEMENT') {
      return NextResponse.redirect(new URL('/chef/dashboard', request.url));
    }

    if (isProfRoute && userRole !== 'PROFESSEUR') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();

  } catch (error) {
    console.error("🔒 Token expiré ou invalide :", error);
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
};