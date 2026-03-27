'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  LayoutDashboard, Users, BookOpen, Building2, 
  Settings, LogOut, ChevronsUpDown, UserCircle, 
  ClipboardCheck, CalendarDays, GraduationCap
} from 'lucide-react'; // Ajout de GraduationCap

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel, useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isMobile, setOpenMobile } = useSidebar();

  // 🔥 CORRECTION ZOMBIE TOKEN : On passe par la route qui tue le cookie HttpOnly
  const handleLogout = () => {
    logout();
    window.location.href = '/logout';
  };

  const getInitials = () => {
    if (!user) return '...';
    return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
  };

  const userRoleLabel = user ? (typeof user.role === 'object' ? user.role.libelle : user.role) : '';
  const displayRole = userRoleLabel === 'CHEF_ETABLISSEMENT' ? 'CHEF ÉTAB.' : userRoleLabel === 'CHEF_DEPARTEMENT' ? 'CHEF DÉP.' : userRoleLabel;


  const getNavItems = () => {
    if (userRoleLabel === 'ADMIN') {
      return [
        { name: 'Tableau de bord', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Professeurs', href: '/admin/professeurs', icon: Users },
        { name: 'Enseignements', href: '/admin/enseignements', icon: BookOpen },
        { name: 'Structure', href: '/admin/structure', icon: Building2 },
        { name: 'Paramètres', href: '/admin/parametres', icon: Settings },
      ];
    }
    
    if (userRoleLabel === 'CHEF_ETABLISSEMENT') {
      return [
        { name: 'Vue d\'ensemble', href: '/chef/dashboard', icon: LayoutDashboard },
        { name: 'Mes Professeurs', href: '/chef/professeurs', icon: Users },
        { name: 'Attributions', href: '/chef/attributions', icon: CalendarDays },
        { name: 'Validations', href: '/chef/validations', icon: ClipboardCheck },
      ];
    }

    if (userRoleLabel === 'CHEF_DEPARTEMENT') {
      return [
        { name: 'Vue d\'ensemble', href: '/chef/dashboard', icon: LayoutDashboard },
        { name: 'Mes Professeurs', href: '/chef/professeurs', icon: Users },
        { name: 'Attributions', href: '/chef/attributions', icon: CalendarDays },
      ];
    }

    // Fallback pour les professeurs
    return [
      { name: 'Mon Espace', href: '/professeur/dashboard', icon: LayoutDashboard },
    ];
  };

  const navItems = getNavItems();

  // Design du Header de la Sidebar selon le Rôle
  const HeaderIcon = userRoleLabel === 'PROFESSEUR' ? GraduationCap : Building2;
  const headerTitle = userRoleLabel === 'ADMIN' ? 'IUG Admin' : userRoleLabel === 'PROFESSEUR' ? 'IUG Enseignant' : 'IUG Direction';

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-card/70 backdrop-blur-2xl z-20">
      
      {/* HEADER */}
      <SidebarHeader className="h-16 border-b border-border/40 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default pointer-events-none">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <HeaderIcon className="size-5 shrink-0" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-black text-foreground tracking-tight text-lg truncate">
                  {headerTitle}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* NAVIGATION */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest px-3 mt-4 mb-2 group-data-[collapsible=icon]:hidden">
            Navigation
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
                    className={`rounded-xl px-3 py-2.5 h-11 transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-secondary/20 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span className="font-semibold truncate">{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="border-t border-border/40 p-2 bg-card/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-xl p-2 hover:bg-secondary/20 transition-all outline-none data-[state=open]:bg-secondary/20 cursor-pointer">
                
                <Avatar className="size-9 rounded-xl border border-border/60 shrink-0">
                  <AvatarFallback className="rounded-xl bg-secondary/50 text-secondary-foreground font-bold text-sm border border-border/40">
                    {user ? getInitials() : <Skeleton className="size-full rounded-xl bg-muted" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="grid flex-1 text-left text-sm leading-tight ml-1 gap-1.5 group-data-[collapsible=icon]:hidden">
                  {user ? (
                    <>
                      <span className="font-bold text-foreground truncate">{user.prenom} {user.nom}</span>
                      <span className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-widest">{displayRole}</span>
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-3 w-20 bg-muted-foreground/20" />
                      <Skeleton className="h-2 w-28 bg-muted-foreground/10" />
                    </>
                  )}
                </div>
                
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/70 shrink-0 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-56 rounded-xl p-2 shadow-2xl z-[100]" side="right" align="end" sideOffset={10}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    <span className="block truncate font-bold text-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1.5" />
                  <DropdownMenuItem className="rounded-lg gap-2.5 font-semibold cursor-pointer py-2">
                    <UserCircle className="size-4 text-muted-foreground" />
                    Mon Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg gap-2.5 font-semibold cursor-pointer py-2">
                    <Settings className="size-4 text-muted-foreground" />
                    Paramètres
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="my-1.5" />
                
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg gap-2.5 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2">
                  <LogOut className="size-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
    </Sidebar>
  );
}