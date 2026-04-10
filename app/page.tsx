'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import IUGLoader from '@/components/ui/IUGLoader';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, getUserRole } = useAuthStore();
  
  const [mounted, setMounted] = useState(false);

  // Correction ESLint
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      const role = getUserRole();
      
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
  }, [mounted, isAuthenticated, getUserRole, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <IUGLoader size={200} />
    </div>
  );
}