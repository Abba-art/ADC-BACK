'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { 
  BookOpen, FileDown, Loader2, Clock, ShieldCheck, Target, 
  Activity, XCircle, AlertTriangle, Info, ListFilter, Search, CalendarDays,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip 
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// ==========================================
// TYPES STRICTS
// ==========================================
interface AttributionProfonde {
  id: string;
  matiere: { nom: string; code: string; credits: number };
  classe: { code: string };
  annee: { id: number; libelle: string };
  statutValidation: 'PROPOSITION' | 'VALIDE' | 'REJETE';
  motif?: string;
}

interface ProfilEnseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  attributions: AttributionProfonde[];
}

interface Annee { id: number; libelle: string; }
interface ApiResponse<T> { success: boolean; data: T; message?: string; }

type FilterStatut = 'ALL' | 'VALIDE' | 'REJETE' | 'PROPOSITION';

export default function ProfesseurDashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  // --- ÉTATS DES FILTRES ---
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('ALL');
  const [filterAnnee, setFilterAnnee] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // --- ÉTATS DES MODALES ---
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, motif: '', contexte: '' });
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);

  // 🔥 CORRECTION : setMounted dans un setTimeout pour éviter le "cascading render"
  useEffect(() => { 
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- REQUÊTES API ---
  const { data: profilReq, isLoading: loadProfil, isError } = useQuery({ 
    queryKey: ['mon-profil'], 
    queryFn: () => fetchApi<ApiResponse<ProfilEnseignant>>('/utilisateurs/me') 
  });

  const { data: anneesReq } = useQuery({ 
    queryKey: ['annees'], 
    queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') 
  });

  const profil = profilReq?.data;
  const RATIO_HEURES = 15;
  
  // 🔥 CORRECTION REACT COMPILER : Extraction des variables avant useMemo
  const allAttributions = profil?.attributions || [];
  const anneesList = anneesReq?.data || [];

  // --- LOGIQUE DE FILTRAGE CASCADE ---
  const attributionsByYear = useMemo(() => {
    if (filterAnnee === 'ALL') return allAttributions;
    return allAttributions.filter(a => a.annee.libelle === filterAnnee);
  }, [allAttributions, filterAnnee]);

  const tableAttributions = useMemo(() => {
    return attributionsByYear.filter(a => {
      const matchStatut = filterStatut === 'ALL' || a.statutValidation === filterStatut;
      const matchSearch = `${a.matiere.nom} ${a.matiere.code} ${a.classe.code}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatut && matchSearch;
    });
  }, [attributionsByYear, filterStatut, searchTerm]);

  // --- CALCULS DES QUOTAS (Sur l'année sélectionnée) ---
  const attributionsValidees = attributionsByYear.filter(a => a.statutValidation === 'VALIDE');
  const totalCredits = attributionsValidees.reduce((sum, a) => sum + a.matiere.credits, 0);
  const chargeHeures = totalCredits * RATIO_HEURES;
  const quota = profil?.statut?.quotaHeureMax || 1;
  const heuresRestantes = Math.max(0, quota - chargeHeures);
  const pourcentage = Math.min((chargeHeures / quota) * 100, 100);
  
  const isOverQuota = chargeHeures >= quota;
  const isNearQuota = pourcentage >= 80 && !isOverQuota;
  const couleurJauge = isOverQuota ? '#EF4444' : isNearQuota ? '#F58220' : '#2E7D32';

  // --- CALCUL DE L'ÉVOLUTION DE LA CHARGE (Année N vs N-1) ---
  const evolutionData = useMemo(() => {
    if (filterAnnee === 'ALL' || anneesList.length === 0) return null;

    const sortedYears = [...anneesList].sort((a, b) => a.libelle.localeCompare(b.libelle));
    const currentIndex = sortedYears.findIndex(y => y.libelle === filterAnnee);

    if (currentIndex <= 0) return null; 
    const prevYear = sortedYears[currentIndex - 1].libelle;

    // Récupération des cours de l'année précédente
    const prevAttributionsValides = allAttributions.filter(a => a.annee.libelle === prevYear && a.statutValidation === 'VALIDE');
    const chargePrev = prevAttributionsValides.reduce((sum, a) => sum + a.matiere.credits, 0) * RATIO_HEURES;
    
    // 🔥 CORRECTION ESLINT NO-EXPLICIT-ANY : On type la fonction avec une interface locale minimale
    const getUid = (a: { matiere: { code: string }; classe: { code: string } }) => `${a.matiere.code}-${a.classe.code}`;
    const currUids = attributionsValidees.map(getUid);
    
    // Cours qu'il avait en N-1 mais qu'il n'a plus en N
    const coursPerdus = prevAttributionsValides.filter(a => !currUids.includes(getUid(a)));
    // Cours explicitement rejetés en N
    const coursRejetesN = allAttributions.filter(a => a.annee.libelle === filterAnnee && a.statutValidation === 'REJETE');

    const diff = chargeHeures - chargePrev;
    
    return { prevYear, chargePrev, diff, coursPerdus, coursRejetesN };
  }, [filterAnnee, anneesList, allAttributions, chargeHeures, attributionsValidees]);

  // --- PRÉPARATION DES DONNÉES POUR LES GRAPHIQUES ---
  const donutData = useMemo(() => [
    { name: 'Consommé', value: chargeHeures, color: couleurJauge },
    { name: 'Restant', value: heuresRestantes, color: 'rgba(0,0,0,0.05)' } 
  ], [chargeHeures, heuresRestantes, couleurJauge]);

  const radarData = useMemo(() => {
    if (!attributionsValidees.length) return [];
    const classMap: Record<string, number> = {};
    attributionsValidees.forEach(a => {
      classMap[a.classe.code] = (classMap[a.classe.code] || 0) + (a.matiere.credits * RATIO_HEURES);
    });
    return Object.entries(classMap).map(([name, value]) => ({
      classe: name, heures: value, fullMark: Math.max(...Object.values(classMap), 50) + 10 
    }));
  }, [attributionsValidees]);

  // --- ACTIONS ---
  const handleExportPDF = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${apiUrl}/utilisateurs/me/export-charge`, '_blank');
  };

  const getStatusBadge = (statut: string, motif?: string, contexte?: string) => {
    switch (statut) {
      case 'VALIDE': 
        return <Badge className="bg-green-500 text-white font-bold border-none shadow-sm"><ShieldCheck className="w-3 h-3 mr-1" /> Validé</Badge>;
      case 'PROPOSITION': 
        return <Badge className="bg-orange-500 text-white font-bold border-none shadow-sm"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'REJETE': 
        return (
          <Badge 
            variant="destructive" 
            className="font-bold border-none shadow-sm cursor-pointer hover:bg-red-600 transition-colors"
            onClick={() => setRejectionModal({ isOpen: true, motif: motif || "Aucun motif spécifié.", contexte: contexte || "" })}
          >
            <XCircle className="w-3 h-3 mr-1" /> Rejeté (Voir)
          </Badge>
        );
      default: return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Bonjour, {user?.prenom}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gérez votre charge horaire et suivez l&apos;état de vos propositions.</p>
        </div>
        <Button onClick={handleExportPDF} className="h-11 rounded-xl px-5 font-bold shadow-lg shadow-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all hover:scale-105 active:scale-95">
          <FileDown className="h-5 w-5 mr-2" /> Fiche de Charge (PDF)
        </Button>
      </motion.div>

      {loadProfil ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : isError || !profil ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl text-destructive">
          <p className="font-bold">Impossible de charger vos données.</p>
        </div>
      ) : (
        <>
          {/* BARRE DE FILTRES GLOBALE */}
          <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-[200px]">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  {/* 🔥 CORRECTION TYPE DU SELECT: on vérifie la nullité proprement */}
                  <Select value={filterAnnee} onValueChange={(val: string | null) => { if (val) setFilterAnnee(val); }}>
                    <SelectTrigger className="w-full h-10 rounded-lg font-bold border-primary/20 bg-background/50">
                      <SelectValue placeholder="Année..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="font-bold">Toutes les années</SelectItem>
                      {anneesList.map(a => <SelectItem key={a.id} value={a.libelle} className="font-bold">{a.libelle}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative w-full sm:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Chercher un cours..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-lg bg-background/50" />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-xl border border-border/50 overflow-x-auto w-full md:w-auto">
                <ListFilter className="w-4 h-4 text-muted-foreground ml-2 mr-1 hidden sm:block" />
                <Button variant={filterStatut === 'ALL' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterStatut('ALL')} className="rounded-lg h-8 text-xs font-bold">Tous</Button>
                <Button variant={filterStatut === 'VALIDE' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterStatut('VALIDE')} className="rounded-lg h-8 text-xs font-bold text-green-500 hover:text-green-600">Validés</Button>
                <Button variant={filterStatut === 'PROPOSITION' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterStatut('PROPOSITION')} className="rounded-lg h-8 text-xs font-bold text-orange-500 hover:text-orange-600">Attente</Button>
                <Button variant={filterStatut === 'REJETE' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterStatut('REJETE')} className="rounded-lg h-8 text-xs font-bold text-red-500 hover:text-red-600">Rejetés</Button>
              </div>

            </CardContent>
          </Card>

          {/* SECTION ANALYTIQUE : 3 COLONNES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. CARTE DE SYNTHÈSE */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl flex flex-col justify-center relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Bilan {filterAnnee !== 'ALL' && `(${filterAnnee})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Validé Consommé</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-foreground">{chargeHeures}</span>
                    <span className="text-lg font-bold text-muted-foreground">Heures</span>
                  </div>
                  
                  {/* PASTILLE D'ÉVOLUTION CLIQUABLE */}
                  {evolutionData && (
                    <div 
                      onClick={() => setEvolutionModalOpen(true)}
                      className={`flex items-center text-[10px] font-bold mt-2 w-fit px-2 py-1 rounded-md cursor-pointer transition-all hover:opacity-80 active:scale-95 shadow-sm border
                        ${evolutionData.diff > 0 ? 'text-green-600 bg-green-500/10 border-green-500/20' : 
                          evolutionData.diff < 0 ? 'text-orange-600 bg-orange-500/10 border-orange-500/20' : 
                          'text-muted-foreground bg-muted/30 border-border/50'}`}
                      title="Cliquez pour voir le détail de l'évolution"
                    >
                      {evolutionData.diff > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : evolutionData.diff < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {evolutionData.diff > 0 ? `+${evolutionData.diff}H (Hausse)` : evolutionData.diff < 0 ? `${Math.abs(evolutionData.diff)}H (Baisse)` : 'Stable'} vs {evolutionData.prevYear}
                      <Info className="w-3 h-3 ml-2 opacity-50" />
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground">Plafond Légal :</span>
                    <span className="text-sm font-black">{quota} H</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground">Marge Restante :</span>
                    <Badge variant="outline" className={`font-bold border-none ${isOverQuota ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                      {isOverQuota ? 'Dépassement' : `${heuresRestantes} Heures`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. JAUGE RADIALE */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <CardHeader className="pb-0 w-full z-10">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Target className="h-4 w-4" /> Progression du Quota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full h-[220px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} 
                      startAngle={90} endAngle={-270} dataKey="value" stroke="none" cornerRadius={10}
                    >
                      {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    {/* 🔥 CORRECTION TYPE DU TOOLTIP : On laisse TypeScript l'inférer */}
                    <RechartsTooltip formatter={(value) => [`${value} Heures`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                  <span className="text-3xl font-black" style={{ color: couleurJauge }}>{Math.round(pourcentage)}%</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Atteint</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. GRAPHIQUE RADAR */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl flex flex-col">
              <CardHeader className="pb-0 z-10">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-center text-muted-foreground flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" /> Répartition par Classe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 w-full h-[220px]">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                      <PolarGrid stroke="rgba(0,0,0,0.1)" />
                      <PolarAngleAxis dataKey="classe" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                      <Radar name="Heures" dataKey="heures" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.4} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-medium">Aucun cours validé</div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* TABLEAU DES COURS */}
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden mt-6">
            <CardHeader className="border-b border-border/40 bg-muted/10 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-xl font-black">Registre des Cours</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Matière</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest">Classe / Année</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest">Volume (H)</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right px-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {tableAttributions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium">Aucun cours ne correspond à vos filtres.</TableCell></TableRow>
                  ) : (
                    tableAttributions.map((a, i) => (
                      <motion.tr key={a.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-sm text-foreground">{a.matiere.nom}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{a.matiere.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-sm">{a.classe.code}</span>
                            <span className="text-[10px] text-muted-foreground">{a.annee.libelle}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-none font-bold uppercase">
                            {a.matiere.credits * RATIO_HEURES} H ({a.matiere.credits} ECTS)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                           <div className="flex flex-col items-end gap-1">
                             {getStatusBadge(a.statutValidation, a.motif, `${a.matiere.nom} - ${a.classe.code}`)}
                           </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ========================================================= */}
      {/* MODALE D'INFORMATION : MOTIF DE REJET                     */}
      {/* ========================================================= */}
      <Dialog open={rejectionModal.isOpen} onOpenChange={(open) => !open && setRejectionModal(prev => ({...prev, isOpen: false}))}>
        <DialogContent className="sm:max-w-md rounded-3xl border-destructive/20 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-destructive flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2" /> Motif du Rejet
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground mt-2">
              Concernant : <span className="text-primary">{rejectionModal.contexte}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 mt-2">
            <p className="text-sm font-medium text-destructive leading-relaxed">
              &quot;{rejectionModal.motif}&quot;
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setRejectionModal(prev => ({...prev, isOpen: false}))} className="w-full font-bold rounded-xl hover:bg-muted">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODALE D'ÉVOLUTION DE CHARGE (N-1 vs N)                   */}
      {/* ========================================================= */}
      <Dialog open={evolutionModalOpen} onOpenChange={setEvolutionModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl border-border/40 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" /> Audit de l&apos;Évolution de Charge
            </DialogTitle>
            <DialogDescription>
              Comparaison entre l&lsquo;année <strong className="text-foreground">{evolutionData?.prevYear}</strong> et <strong className="text-foreground">{filterAnnee}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Colonne : Cours Perdus / Non reconduits */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                <Minus className="w-3 h-3 mr-1 text-orange-500" /> Perdus ou Non Reconduits
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {evolutionData?.coursPerdus.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun cours perdu.</p>
                ) : (
                  evolutionData?.coursPerdus.map(a => (
                    <div key={a.id} className="bg-background rounded-lg p-3 border border-border/40 shadow-sm">
                      <p className="font-bold text-sm">{a.matiere.nom}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{a.classe.code}</span>
                        <span className="text-xs font-bold text-orange-500">-{a.matiere.credits * RATIO_HEURES}H</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne : Cours Explicitement Rejetés cette année */}
            <div className="space-y-3 bg-destructive/5 p-4 rounded-2xl border border-destructive/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-destructive flex items-center">
                <XCircle className="w-3 h-3 mr-1" /> Rejetés par la Direction en {filterAnnee}
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {evolutionData?.coursRejetesN.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun cours rejeté.</p>
                ) : (
                  evolutionData?.coursRejetesN.map(a => (
                    <div key={a.id} className="bg-background rounded-lg p-3 border border-destructive/20 shadow-sm">
                      <p className="font-bold text-sm">{a.matiere.nom}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{a.classe.code}</span>
                        <span className="text-xs font-bold text-destructive">{a.matiere.credits * RATIO_HEURES}H</span>
                      </div>
                      {a.motif && <p className="text-[10px] text-destructive mt-2 bg-destructive/10 p-1.5 rounded">{a.motif}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-background p-4 rounded-2xl border border-border/50 flex justify-between items-center">
            <span className="text-sm font-bold text-muted-foreground">Bilan net (N vs N-1) :</span>
            <span className={`text-lg font-black ${evolutionData?.diff && evolutionData.diff > 0 ? 'text-green-500' : 'text-orange-500'}`}>
              {evolutionData?.diff && evolutionData.diff > 0 ? '+' : ''}{evolutionData?.diff} Heures
            </span>
          </div>

        </DialogContent>
      </Dialog>

    </div>
  );
}