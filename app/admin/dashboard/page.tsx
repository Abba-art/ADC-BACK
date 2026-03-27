'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { Users, BookOpen, Building2, Layers, Loader2, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalProfesseurs: number;
  totalCourses: number;
  totalInstituts: number;
  totalFilieres: number;
  message: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => fetchApi<ApiResponse<DashboardStats>>('/dashboard'),
    staleTime: 60000, 
  });

  const stats = data?.data;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } }
  };

  const statCards = [
    { title: 'Professeurs Actifs', value: stats?.totalProfesseurs || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Cours Enregistrés', value: stats?.totalCourses || 0, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Instituts', value: stats?.totalInstituts || 0, icon: Building2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Filières', value: stats?.totalFilieres || 0, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-10">
      
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm sm:text-base font-medium text-muted-foreground mt-1.5 max-w-2xl">
            Bienvenue, <span className="font-bold text-primary">{user?.prenom} {user?.nom}</span>. Voici les statistiques actuelles issues du système.
          </p>
        </div>
        <div className="hidden sm:block">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card/60 text-primary shadow-lg border border-border/40 backdrop-blur-xl">
                <BarChart3 size={24}/>
            </div>
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-lg">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-destructive/10 p-8 text-center text-destructive border border-destructive/20 shadow-lg animate-in fade-in duration-300 backdrop-blur-xl">
          <p className="font-bold text-lg">Impossible de charger les statistiques.</p>
          <p className="text-sm mt-1.5">Vérifiez la connexion avec le serveur backend.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <motion.div key={index} variants={cardVariants}>
              <Card className="relative overflow-hidden border border-border/40 bg-card/70 backdrop-blur-2xl shadow-lg shadow-black/5 transition-all hover:shadow-xl hover:border-primary/40 group">
                <div className={`absolute top-0 left-0 w-full h-1 ${card.bg.replace('/10', '/80')} opacity-0 group-hover:opacity-100 transition-opacity`}/>

                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-foreground tracking-tighter">
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

    </div>
  );
}