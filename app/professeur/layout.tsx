'use client';

import React from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/AppSidebar';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import IUGLoader from '@/components/ui/IUGLoader';
import { useAuth } from '@/hooks/useAuth';

export default function ProfesseurLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <IUGLoader size={200} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
        
        {/* Le fond animé Net (sans blur), l'interface se chargera de le flouter */}
        <div className="fixed inset-0 z-0 opacity-[0.15] pointer-events-none">
          <AnimatedBackground />
        </div>

        {/* La Sidebar Shadcn universelle (qui gère les liens selon le rôle) */}
        <AppSidebar />

        {/* Le contenu principal */}
        <SidebarInset className="relative z-10 flex flex-col bg-transparent overflow-hidden">
          
          {/* Header Mobile/Tablet avec Glassmorphism */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-card/60 backdrop-blur-xl px-6 md:px-8 shadow-sm">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary transition-colors h-9 w-9" />
            <div className="h-6 w-px bg-border/60" />
            <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-2">Espace Enseignant</span>
          </header>

          {/* Contenu de la page */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 relative">
            {children}
          </div>

        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}