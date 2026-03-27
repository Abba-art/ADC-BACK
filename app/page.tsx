'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import IUGLoader from '@/components/ui/IUGLoader';

export default function RootPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        // Si l'utilisateur n'est pas authentifié ou si le compte n'existe plus (Zombie token)
        router.replace('/auth/login');
      } else {
        const role = typeof user.role === 'object' && user.role !== null ? user.role.libelle : user.role;
        
        switch (role) {
          case 'ADMIN':
            router.replace('/admin/dashboard');
            break;
          case 'CHEF_ETABLISSEMENT':
          case 'CHEF_DEPARTEMENT':
            router.replace('/chef/dashboard');
            break;
          case 'PROFESSEUR':
            router.replace('/professeur/dashboard');
            break;
          default:
            router.replace('/auth/login');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <IUGLoader size={250} />
    </div>
  );
}