'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { Users, BookOpen, ShieldAlert, Loader2, CheckCircle, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// On utilise les types que ton backend renvoie
interface DashboardStats {
  totalProfesseurs: number;
  totalCourses: number;
  totalInstituts: number;
  totalFilieres: number;
}

interface Enseignement {
  id: string;
  course: { matiere: { nom: string; code: string }; classe: { code: string } };
  utilisateur: { nom: string; prenom: string };
  statutValidation: string;
}

interface ApiResponse<T> { success: boolean; data: T; count?: number; }

export default function ChefDashboardPage() {
  const { user } = useAuthStore();
  const isChefEtablissement = user?.role === 'CHEF_ETABLISSEMENT';

  // --- REQUÊTES API ---
  const { data: statsData, isLoading: loadStats } = useQuery({
    queryKey: ['chef-stats'],
    queryFn: () => fetchApi<ApiResponse<DashboardStats>>('/dashboard'),
  });

  // Les propositions en attente (surtout utile pour le Chef d'Établissement)
  const { data: propsData, isLoading: loadProps } = useQuery({
    queryKey: ['enseignements-propositions'],
    queryFn: () => fetchApi<ApiResponse<Enseignement[]>>('/enseignements/propositions'),
    enabled: isChefEtablissement, // Ne se lance que si c'est un CE
  });

  const stats = statsData?.data;
  const propositions = propsData?.data || [];

  // --- ANIMATIONS ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (loadStats) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
          Tableau de Bord
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Bienvenue, <span className="font-bold text-primary">{user?.prenom} {user?.nom}</span>. 
          Gérez les affectations d&apos;enseignements de vos instituts.
        </p>
      </motion.div>

      {/* STATISTIQUES GLOBALES */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl shadow-black/5 hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Professeurs Actifs</CardTitle>
              <div className="h-10 w-10 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-xl"><Users className="h-5 w-5" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{stats?.totalProfesseurs || 0}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl shadow-black/5 hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cours Enregistrés</CardTitle>
              <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-xl"><BookOpen className="h-5 w-5" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{stats?.totalCourses || 0}</div>
            </CardContent>
          </Card>
        </motion.div>

        {isChefEtablissement && (
          <motion.div variants={itemVariants}>
            <Card className="border-orange-500/30 bg-orange-500/5 backdrop-blur-2xl shadow-xl shadow-orange-500/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase text-orange-600">À Valider</CardTitle>
                <div className="h-10 w-10 bg-orange-500/20 text-orange-600 flex items-center justify-center rounded-xl"><Clock className="h-5 w-5" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-orange-600">{loadProps ? '...' : propositions.length}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* VUE SPÉCIFIQUE CHEF ETABLISSEMENT : PROPOSITIONS RÉCENTES */}
      {isChefEtablissement && (
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl shadow-black/5 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-80" />
            <CardHeader>
              <CardTitle className="text-lg">Propositions en attente de validation</CardTitle>
              <CardDescription>Affectations soumises par les Chefs de Département nécessitant votre accord.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="px-6">Matière & Classe</TableHead>
                    <TableHead>Professeur Proposé</TableHead>
                    <TableHead className="text-right px-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadProps ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Chargement...</TableCell></TableRow>
                  ) : propositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground font-medium">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        Toutes les propositions ont été traitées.
                      </TableCell>
                    </TableRow>
                  ) : (
                    propositions.slice(0, 5).map((prop) => (
                      <TableRow key={prop.id} className="hover:bg-muted/20 border-border/40">
                        <TableCell className="px-6">
                          <div className="font-bold">{prop.course.matiere.nom}</div>
                          <div className="text-xs text-muted-foreground font-mono">{prop.course.classe.code}</div>
                        </TableCell>
                        <TableCell className="font-semibold">{prop.utilisateur.nom} {prop.utilisateur.prenom}</TableCell>
                        <TableCell className="text-right px-6">
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">En attente</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}