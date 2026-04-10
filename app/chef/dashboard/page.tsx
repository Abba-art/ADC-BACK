'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { Users, Loader2, BarChart3, ClipboardCheck,  FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStats { totalProfesseurs: number; totalAttributions: number; propositionsEnAttente: number; message: string; }
interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export default function ChefDashboardPage() {
  const { getUserRole } = useAuthStore();
  const role = getUserRole();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chef-dashboard-stats'],
    queryFn: () => fetchApi<ApiResponse<DashboardStats>>('/dashboard'),
  });

  const stats = data?.data;

  // Fonction pour télécharger le PDF (Bilan du département)
  const handleExportPDF = () => {
    window.open('http://localhost:3000/dashboard/export/bilan', '_blank');
  };

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const cardVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Tableau de Bord</h1>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1">
            {role === 'CHEF_ETABLISSEMENT' ? 'Direction Générale' : 'Direction Pédagogique'}
          </p>
        </div>
        <Button onClick={handleExportPDF} className="h-11 rounded-xl px-5 font-bold shadow-lg shadow-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all hover:scale-105 active:scale-95">
          <FileDown className="h-5 w-5 mr-2" /> Exporter le Bilan (PDF)
        </Button>
      </motion.div>

      {isLoading && <div className="flex h-60 items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
      
      {!isLoading && !isError && stats && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div variants={cardVariants}>
            <Card className="relative overflow-hidden border border-border/40 bg-card/70 backdrop-blur-2xl shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Professeurs Actifs</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              </CardHeader>
              <CardContent className="px-6 pb-6"><div className="text-4xl font-black text-foreground">{stats.totalProfesseurs}</div></CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="relative overflow-hidden border border-border/40 bg-card/70 backdrop-blur-2xl shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cours Assignés</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10"><BarChart3 className="h-5 w-5 text-secondary" /></div>
              </CardHeader>
              <CardContent className="px-6 pb-6"><div className="text-4xl font-black text-foreground">{stats.totalAttributions}</div></CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="relative overflow-hidden border border-border/40 bg-card/70 backdrop-blur-2xl shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">En Attente de Validation</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10"><ClipboardCheck className="h-5 w-5 text-orange-500" /></div>
              </CardHeader>
              <CardContent className="px-6 pb-6"><div className="text-4xl font-black text-foreground">{stats.propositionsEnAttente}</div></CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}