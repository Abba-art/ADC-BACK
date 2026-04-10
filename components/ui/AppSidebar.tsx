'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, Building2, Settings,
  LogOut, ChevronsUpDown, UserCircle, ShieldCheck, Layers, CalendarDays, ClipboardCheck, GraduationCap,
  Trash2 // 🔥 AJOUT DE L'ICÔNE POUR LES ARCHIVES
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel, useSidebar
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, getUserRole } = useAuthStore();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getInitials = () => {
    if (!user) return '...';
    return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
  };

  const userRole = getUserRole();

  // --- LOGIQUE DYNAMIQUE DES LIENS ---
  const getNavItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Utilisateurs', href: '/admin/professeurs', icon: Users },
          { name: 'Organisation', href: '/admin/organisation', icon: Building2 },
          { name: 'Structure', href: '/admin/structure', icon: Layers },
          { name: 'Archives', href: '/admin/archives', icon: Trash2 }, // 🔥 AJOUT DE LA ROUTE ARCHIVES
          { name: 'Paramètres', href: '/admin/parametres', icon: Settings },
        ];
      case 'CHEF_DEPARTEMENT':
        return [
          { name: 'Dashboard', href: '/chef/dashboard', icon: LayoutDashboard },
          { name: 'Attributions', href: '/chef/attributions', icon: CalendarDays },
          { name: 'Enseignants', href: '/chef/professeurs', icon: Users },
        ];
      case 'CHEF_ETABLISSEMENT': // Le Directeur a les Validations en plus
        return [
          { name: 'Dashboard', href: '/chef/dashboard', icon: LayoutDashboard },
          { name: 'Attributions', href: '/chef/attributions', icon: CalendarDays },
          { name: 'Validations', href: '/chef/validations', icon: ClipboardCheck },
          { name: 'Enseignants', href: '/chef/professeurs', icon: Users },
        ];
      case 'PROFESSEUR':
        return [
          { name: 'Mon Espace', href: '/professeur/dashboard', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Affichage du nom du Rôle en bas
  const displayRole = userRole === 'CHEF_ETABLISSEMENT' ? 'Directeur'
    : userRole === 'CHEF_DEPARTEMENT' ? 'Chef de Département'
      : userRole === 'PROFESSEUR' ? 'Enseignant'
        : 'Administrateur';

  const HeaderIcon = userRole === 'ADMIN' ? ShieldCheck : GraduationCap;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-card/70 backdrop-blur-2xl z-20">

      <SidebarHeader className="h-16 border-b border-border/40 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default pointer-events-none">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <HeaderIcon className="size-5 shrink-0" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-2">
                <span className="font-black text-foreground tracking-tight text-lg truncate">
                  ADC Academic
                </span>
                <span className="text-[9px] uppercase tracking-widest text-primary font-bold">Système ADC</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest px-3 mt-4 mb-2 group-data-[collapsible=icon]:hidden">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    tooltip={item.name}
                    isActive={isActive}
                    onClick={() => {
                      router.push(item.href);
                      if (isMobile) setOpenMobile(false);
                    }}
                    className={`rounded-xl px-3 py-2.5 h-11 transition-all duration-200 ${isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold'
                        : 'text-muted-foreground hover:bg-secondary/10 hover:text-foreground font-medium'
                      }`}
                  >
                    <item.icon className={`size-5 shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="truncate ml-2">{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-2 bg-card/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div role="button" tabIndex={0} className="flex w-full items-center gap-2 rounded-xl p-2 hover:bg-secondary/10 transition-all outline-none data-[state=open]:bg-secondary/10 cursor-pointer border border-transparent hover:border-border/50">
                  <Avatar className="size-8 rounded-lg border border-border/60 shrink-0">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {user ? getInitials() : <Skeleton className="size-full" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight ml-2 group-data-[collapsible=icon]:hidden">
                    {user ? (
                      <>
                        <span className="font-bold text-foreground truncate">{user.prenom} {user.nom}</span>
                        <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-tighter">{displayRole}</span>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20 bg-muted" />
                        <Skeleton className="h-2 w-14 bg-muted" />
                      </div>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/70 shrink-0 group-data-[collapsible=icon]:hidden" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 rounded-xl p-2 shadow-2xl z-[100]" side="right" align="end" sideOffset={10}>
                <div className="px-2 py-1.5 flex flex-col space-y-1 cursor-default">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Connecté en tant que</p>
                  <p className="text-sm font-bold truncate text-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="rounded-lg gap-2.5 font-bold cursor-pointer py-2">
                    <UserCircle className="size-4 text-primary" /> Mon Profil
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg gap-2.5 font-black text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2">
                  <LogOut className="size-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}