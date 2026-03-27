'use client';

import React, { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/AppSidebar';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import IUGLoader from '@/components/ui/IUGLoader';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Extraction du rôle en toute sécurité
  const roleLibelle = user ? (typeof user.role === 'object' ? user.role.libelle : user.role) : null;
  const isAuthorized = roleLibelle === 'CHEF_DEPARTEMENT' || roleLibelle === 'CHEF_ETABLISSEMENT';

  // 🔥 CORRECTION : Redirection sécurisée dans un useEffect
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAuthorized) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, isAuthorized, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <IUGLoader size={200} />
      </div>
    );
  }

  // Si on n'est pas autorisé, on ne rend rien (le useEffect va nous rediriger)
  if (!isAuthenticated || !isAuthorized) return null;

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
        
        <div className="fixed inset-0 z-0 opacity-[0.15] pointer-events-none">
          <AnimatedBackground />
        </div>

        <AppSidebar />

        <SidebarInset className="relative z-10 flex flex-col bg-transparent overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-card/60 backdrop-blur-xl px-6 md:px-8 shadow-sm">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary transition-colors h-9 w-9" />
            <div className="h-6 w-px bg-border/60" />
            <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-2">
              {roleLibelle === 'CHEF_ETABLISSEMENT' ? "Direction d'Établissement" : "Direction de Département"}
            </span>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 relative">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}