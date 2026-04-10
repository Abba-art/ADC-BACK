'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/AppSidebar';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import IUGLoader from '@/components/ui/IUGLoader';

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  const { getUserRole, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // 1. Gérer le montage de manière asynchrone
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // 2. Gérer la sécurité de la route
  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        window.location.href = '/logout';
      } else {
        const role = getUserRole();
        // Le Chef de Dép, le Directeur, et l'Admin peuvent voir cet espace
        if (role !== 'CHEF_DEPARTEMENT' && role !== 'CHEF_ETABLISSEMENT' && role !== 'ADMIN') {
          router.push('/');
        }
      }
    }
  }, [mounted, isAuthenticated, getUserRole, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <IUGLoader size={100} />
      </div>
    );
  }

  const role = getUserRole();
  if (role !== 'CHEF_DEPARTEMENT' && role !== 'CHEF_ETABLISSEMENT' && role !== 'ADMIN') return null;

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background font-sans">
        <div className="fixed inset-0 z-0 opacity-[0.15] pointer-events-none">
          <AnimatedBackground />
        </div>
        
        <AppSidebar />
        
        <SidebarInset className="relative z-10 flex flex-col bg-transparent overflow-hidden w-full">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-card/60 backdrop-blur-xl px-6 md:px-8 shadow-sm">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary transition-colors h-9 w-9" />
            <div className="h-6 w-px bg-border/60 mx-2" />
            <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
              {role === 'CHEF_ETABLISSEMENT' ? 'Direction Générale' : 'Direction Pédagogique'}
            </span>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 scrollbar-thin scrollbar-thumb-primary/20">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}