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
      if (!isAuthenticated) {
        // Renvoie au vigile
        router.replace('/login');
      } else if (user) {
        // Redirection vers le bon groupe Root selon le statut
        const role = typeof user.role === 'object' ? user.role.libelle : user.role;
        
        switch (role) {
          case 'ADMIN':
          case 'CHEF_ETABLISSEMENT':
            router.replace('/admin/dashboard');
            break;
          case 'CHEF_DEPARTEMENT':
            router.replace('/chef/dashboard');
            break;
          case 'PROFESSEUR':
            router.replace('/professeur/dashboard');
            break;
          default:
            // Par sécurité, s'il y a un bug de rôle
            router.replace('/login');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // On affiche le beau loader IUG pendant que le hook interroge le backend
  return (
    <div className="flex min-h-screen items-center justify-center bg-iug-bg">
      <IUGLoader size={250} />
    </div>
  );
}