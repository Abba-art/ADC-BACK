import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = process.env.JWT_SECRET || 'secret_par_defaut_a_changer';
const secretKey = new TextEncoder().encode(SECRET);

// Typage strict pour le contenu du Token JWT
interface CustomJwtPayload {
  role?: string | { libelle?: string };
  user?: {
    role?: string | { libelle?: string };
  };
  [key: string]: unknown;
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Route de déconnexion "Tue-Cookie"
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
    // Utilisation de l'interface au lieu de "any"
    const typedPayload = payload as CustomJwtPayload;
    
    const userData = typedPayload.user || typedPayload;
    const rawRole = userData.role;
    
    let userRole = '';
    if (typeof rawRole === 'object' && rawRole !== null && 'libelle' in rawRole) {
        userRole = String(rawRole.libelle);
    } else if (typeof rawRole === 'string') {
        userRole = rawRole;
    }
    userRole = userRole.toUpperCase().trim();

    // Redirection automatique si on est déjà connecté et qu'on va sur /login
    if (isAuthPage) {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (userRole === 'CHEF_DEPARTEMENT' || userRole === 'CHEF_ETABLISSEMENT') return NextResponse.redirect(new URL('/chef/dashboard', request.url));
      return NextResponse.redirect(new URL('/professeur/dashboard', request.url));
    }

    const isAdminRoute = pathname.startsWith('/admin');
    const isChefRoute = pathname.startsWith('/chef');
    const isProfRoute = pathname.startsWith('/professeur');

    // L'Admin a un "Passe-Partout"
    if (userRole === 'ADMIN') {
      return NextResponse.next();
    }

    // Sécurités pour les autres rôles
    if (isAdminRoute && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (isChefRoute && userRole !== 'CHEF_DEPARTEMENT' && userRole !== 'CHEF_ETABLISSEMENT') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (pathname.startsWith('/chef/validations') && userRole !== 'CHEF_ETABLISSEMENT') {
      return NextResponse.redirect(new URL('/chef/dashboard', request.url));
    }

    if (isProfRoute && userRole !== 'PROFESSEUR') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
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