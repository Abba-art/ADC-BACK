'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  Users, Loader2, BarChart3, ClipboardCheck, AlertCircle, FileDown, 
  Activity, Target, Network
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Imports Recharts pour les graphiques
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip 
} from 'recharts';

// ==========================================
// TYPES STRICTS
// ==========================================
interface DashboardStats { 
  totalProfesseurs: number; 
  totalAttributions: number; 
  propositionsEnAttente: number; 
  message: string; 
}

interface Attribution {
  id: string;
  utilisateur: { nom: string; prenom: string };
  matiere: { nom: string; code: string; credits: number };
  classe: { code: string };
  statutValidation: 'PROPOSITION' | 'VALIDE' | 'REJETE';
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);

  // 🔥 CORRECTION : Éviter le "Cascading Render" avec setTimeout
  useEffect(() => { 
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- REQUÊTE 1 : Statistiques Globales ---
  const { data: statsData, isLoading: loadStats, isError: errorStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => fetchApi<ApiResponse<DashboardStats>>('/dashboard'),
    staleTime: 60000,
  });

  // --- REQUÊTE 2 : Toutes les attributions pour alimenter les graphiques ---
  const { data: attrData, isLoading: loadAttr } = useQuery({
    queryKey: ['admin-all-attributions'],
    queryFn: () => fetchApi<ApiResponse<Attribution[]>>('/attributions/toutes'),
    staleTime: 60000,
  });

  const stats = statsData?.data;
  const allAttributions = attrData?.data || [];
  const RATIO_HEURES = 15;

  // ==========================================
  // CALCULS POUR LES GRAPHIQUES (useMemo isolés)
  // ==========================================
  
  // 1. Données pour le Pie Chart (Statuts des attributions)
  const pieData = useMemo(() => {
    if (!allAttributions.length) return [];
    
    const valides = allAttributions.filter(a => a.statutValidation === 'VALIDE').length;
    const attente = allAttributions.filter(a => a.statutValidation === 'PROPOSITION').length;
    const rejetes = allAttributions.filter(a => a.statutValidation === 'REJETE').length;

    return [
      { name: 'Validées', value: valides, color: '#2E7D32' },
      { name: 'En Attente', value: attente, color: '#F58220' },
      { name: 'Rejetées', value: rejetes, color: '#EF4444' },
    ].filter(d => d.value > 0);
  }, [allAttributions]);

  // 2. Données pour le Radar Chart (Toile d'araignée : Charge par Classe)
  const radarData = useMemo(() => {
    if (!allAttributions.length) return [];
    
    const classMap: Record<string, number> = {};
    
    // On ne calcule le volume horaire que sur les cours validés
    allAttributions.filter(a => a.statutValidation === 'VALIDE').forEach(a => {
      classMap[a.classe.code] = (classMap[a.classe.code] || 0) + (a.matiere.credits * RATIO_HEURES);
    });

    // On trie pour garder les 6 classes les plus chargées (pour un beau radar)
    const sortedClasses = Object.entries(classMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const maxHeures = sortedClasses.length > 0 ? Math.max(...sortedClasses.map(c => c[1])) : 50;

    return sortedClasses.map(([name, value]) => ({
      classe: name,
      heures: value,
      fullMark: maxHeures + 20 
    }));
  }, [allAttributions]);


  // --- ACTIONS ---
  const handleExportPDF = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${apiUrl}/dashboard/export/bilan`, '_blank');
  };

  // --- ANIMATIONS ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } } };
  const cardVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } } };

  const statCards = [
    { title: 'Utilisateurs Actifs', value: stats?.totalProfesseurs || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Total Attributions', value: stats?.totalAttributions || 0, icon: BarChart3, color: 'text-secondary', bg: 'bg-secondary/10' },
    { title: 'Validations en Attente', value: stats?.propositionsEnAttente || 0, icon: ClipboardCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const isLoading = loadStats || loadAttr;
  const isError = errorStats;

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Gestion Système</h1>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1">Rôle : Administrateur</p>
        </div>
        <Button onClick={handleExportPDF} className="h-11 rounded-xl px-5 font-bold shadow-lg shadow-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all hover:scale-105 active:scale-95">
          <FileDown className="h-5 w-5 mr-2" /> Exporter le Bilan Global
        </Button>
      </motion.div>

      {isLoading && (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-lg">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      
      {isError && (
        <div className="rounded-2xl bg-destructive/10 p-8 text-center text-destructive border border-destructive/20 shadow-lg backdrop-blur-xl">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-80" />
          <p className="font-bold text-lg">Impossible de charger les statistiques globales.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* CARTES DE STATISTIQUES */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card, index) => (
              <motion.div key={index} variants={cardVariants}>
                <Card className="relative overflow-hidden border border-border/40 bg-card/70 backdrop-blur-2xl shadow-xl transition-all hover:shadow-2xl hover:border-primary/30 group">
                  <div className={`absolute top-0 left-0 w-full h-1 ${card.bg.replace('/10', '/80')} opacity-0 group-hover:opacity-100 transition-opacity`}/>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="text-4xl font-black text-foreground tracking-tighter">{card.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* SECTION GRAPHIQUES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            
            {/* GRAPHIQUE RADAR : Densité par classe */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl flex flex-col">
              <CardHeader className="pb-0 z-10 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-bold flex items-center text-primary uppercase tracking-wider pb-4">
                  <Network className="w-5 h-5 mr-2" /> Densité Horaire (Top Classes)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full h-[300px]">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(0,0,0,0.1)" />
                      <PolarAngleAxis dataKey="classe" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                      <Radar name="Heures Validées" dataKey="heures" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.4} />
                      {/* 🔥 CORRECTION TYPESCRIPT TOOLTIP */}
                      <RechartsTooltip formatter={(value) => `${value || 0} Heures`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-medium">Données insuffisantes</div>
                )}
              </CardContent>
            </Card>

            {/* GRAPHIQUE PIE : Répartition des statuts */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <CardHeader className="pb-0 w-full z-10 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-bold flex items-center text-secondary uppercase tracking-wider pb-4">
                  <Target className="w-5 h-5 mr-2" /> Taux d&#39;Approbation Global
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full h-[300px] relative flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} 
                        paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}
                      >
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      {/* 🔥 CORRECTION TYPESCRIPT TOOLTIP */}
                      <RechartsTooltip formatter={(value) => `${value || 0} Dossiers`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-medium">Données insuffisantes</div>
                )}
                
                {/* Centre du Donut */}
                {pieData.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-12">
                    <Activity className="w-6 h-6 text-muted-foreground/50 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Volume</span>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* ALERTE D'ACTIONS REQUISES */}
          {stats && stats.propositionsEnAttente > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start sm:items-center gap-4 text-orange-600 shadow-sm mt-4">
               <AlertCircle className="h-6 w-6 shrink-0 mt-0.5 sm:mt-0" />
               <div>
                 <p className="font-bold text-base text-orange-700">Goulet d&apos;étranglement détecté</p>
                 <p className="text-sm font-medium mt-0.5 text-orange-600/80">Le système signale <strong className="font-black text-orange-700">{stats.propositionsEnAttente} proposition(s)</strong> de cours en attente d&apos;une validation par la Direction. Veuillez notifier le service concerné.</p>
               </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}