'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  CalendarDays, Plus, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, Copy, Info, Search, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from 'sonner';

// Recharts pour les graphiques
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  attributions?: { matiere: { credits: number } }[]; 
}

interface Matiere { id: number; code: string; nom: string; credits: number; }
interface Classe { id: number; code: string; departement: { nom: string } }
interface Annee { id: number; libelle: string; }
interface Attribution {
  id: string;
  utilisateur: { nom: string; prenom: string };
  matiere: { nom: string; code: string; credits: number };
  classe: { code: string };
  annee: { id?: number; libelle: string };
  statutValidation: 'PROPOSITION' | 'VALIDE' | 'REJETE';
  motif?: string;
}

interface AssignationPayload {
  utilisateurId: string;
  matiereId: number;
  classeId: number;
  anneeId: number;
  motif?: string;
}

interface ReconductionPayload {
  anneeSourceId: number;
  anneeCibleId: number;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; count?: number; }

export default function ChefAttributionsPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // 🔥 CORRECTION : setMounted dans un setTimeout pour éviter le cascading render
  useEffect(() => { 
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- ÉTATS GLOBAUX & FILTRES ---
  const [globalAnneeFilter, setGlobalAnneeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // --- ÉTATS DES MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReconductionModalOpen, setIsReconductionModalOpen] = useState(false);
  const [rejectionModal, setRejectionModal] = useState<{isOpen: boolean, motif: string, context: string}>({isOpen: false, motif: '', context: ''});

  const [form, setForm] = useState({ utilisateurId: '', matiereId: '', classeId: '', anneeId: '', motif: '' });
  const [reconductionForm, setReconductionForm] = useState({ anneeSourceId: '', anneeCibleId: '' });

  // --- REQUÊTES API ---
  const { data: profsReq } = useQuery({ 
    queryKey: ['professeurs', form.anneeId], 
    queryFn: () => fetchApi<ApiResponse<Professeur[]>>(form.anneeId ? `/utilisateurs/professeurs?anneeId=${form.anneeId}` : '/utilisateurs/professeurs')
  });

  const { data: matieresReq } = useQuery({ queryKey: ['matieres'], queryFn: () => fetchApi<ApiResponse<Matiere[]>>('/structure/matieres') });
  const { data: classesReq } = useQuery({ queryKey: ['classes'], queryFn: () => fetchApi<ApiResponse<Classe[]>>('/structure/classes') });
  const { data: anneesReq } = useQuery({ queryKey: ['annees'], queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') });
  const { data: attrReq, isLoading: loadAtt } = useQuery({ queryKey: ['attributions'], queryFn: () => fetchApi<ApiResponse<Attribution[]>>('/attributions/toutes') });

  // --- MUTATIONS ---
  const assignMutation = useMutation({
    mutationFn: (payload: AssignationPayload) => fetchApi<ApiResponse<unknown>>('/attributions/assigner', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Proposition soumise avec succès');
      setIsModalOpen(false);
      setForm({ utilisateurId: '', matiereId: '', classeId: '', anneeId: '', motif: '' });
      queryClient.invalidateQueries({ queryKey: ['attributions'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const reconductionMutation = useMutation({
    // 🔥 CORRECTION TYPESCRIPT : Remplacement de "any" par le type exact attendu
    mutationFn: (payload: ReconductionPayload) => fetchApi<ApiResponse<{ count?: number }>>('/attributions/reconduire', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(`${res.data?.count || 0} enseignements reconduits avec succès !`);
      setIsReconductionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['attributions'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const RATIO_HEURES = 15;

  // --- FILTRAGE DES DONNÉES EN TEMPS RÉEL ---
  const filteredAttributions = useMemo(() => {
    return (attrReq?.data || []).filter(a => {
      const matchAnnee = globalAnneeFilter === 'ALL' || a.annee.libelle === globalAnneeFilter;
      const matchSearch = `${a.utilisateur.nom} ${a.utilisateur.prenom} ${a.matiere.nom} ${a.matiere.code} ${a.classe.code}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAnnee && matchSearch;
    });
  }, [attrReq?.data, globalAnneeFilter, searchTerm]);

  // --- DONNÉES POUR LES GRAPHIQUES ---
  const stats = useMemo(() => {
    const enAttente = filteredAttributions.filter(a => a.statutValidation === 'PROPOSITION').length;
    const valides = filteredAttributions.filter(a => a.statutValidation === 'VALIDE').length;
    const rejetees = filteredAttributions.filter(a => a.statutValidation === 'REJETE').length;

    // Data pour le Pie Chart
    const pieData = [
      { name: 'Validé', value: valides, color: '#2E7D32' }, 
      { name: 'En Attente', value: enAttente, color: '#F58220' }, 
      { name: 'Rejeté', value: rejetees, color: '#EF4444' }, 
    ].filter(d => d.value > 0);

    // Data pour le Bar Chart
    const profLoads: Record<string, number> = {};
    filteredAttributions.filter(a => a.statutValidation === 'VALIDE').forEach(a => {
      const name = `${a.utilisateur.prenom[0]}. ${a.utilisateur.nom}`;
      profLoads[name] = (profLoads[name] || 0) + (a.matiere.credits * RATIO_HEURES);
    });

    const barData = Object.entries(profLoads)
      .map(([name, heures]) => ({ name, heures }))
      .sort((a, b) => b.heures - a.heures)
      .slice(0, 5); 

    return { enAttente, valides, rejetees, pieData, barData };
  }, [filteredAttributions]);

  // --- LOGIQUE DU FORMULAIRE ---
  const selectedProf = profsReq?.data?.find(p => p.id === form.utilisateurId);
  const selectedMatiere = matieresReq?.data?.find(m => m.id === Number(form.matiereId));
  const chargeActuelleHeures = (selectedProf?.attributions?.reduce((sum, a) => sum + (a.matiere?.credits || 0), 0) || 0) * RATIO_HEURES;
  const chargeProjeteeHeures = selectedMatiere ? selectedMatiere.credits * RATIO_HEURES : 0;
  const chargeTotaleFutureHeures = chargeActuelleHeures + chargeProjeteeHeures;
  const quotaMax = selectedProf?.statut?.quotaHeureMax || 1; 
  const isOverQuota = chargeTotaleFutureHeures > quotaMax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverQuota) return toast.error("Quota dépassé !");
    assignMutation.mutate({ utilisateurId: form.utilisateurId, matiereId: Number(form.matiereId), classeId: Number(form.classeId), anneeId: Number(form.anneeId), motif: 'Nouvelle proposition' });
  };

  const handleReconductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reconductionForm.anneeSourceId === reconductionForm.anneeCibleId) return toast.error('Années identiques.');
    reconductionMutation.mutate({ anneeSourceId: Number(reconductionForm.anneeSourceId), anneeCibleId: Number(reconductionForm.anneeCibleId) });
  };

  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER & BOUTONS */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Tableau de Bord Pédagogique</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gérez, analysez et suivez les attributions (1 Crédit = 15 Heures).</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsReconductionModalOpen(true)} className="h-11 rounded-xl px-5 font-bold shadow-sm">
            <Copy className="h-5 w-5 mr-2" /> Reconduction
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="h-11 rounded-xl px-5 font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-5 w-5 mr-2" /> Assigner
          </Button>
        </div>
      </motion.div>

      {/* BARRE DE FILTRES GLOBALE */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-md">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <CalendarDays className="h-5 w-5 text-primary" />
            {/* 🔥 CORRECTION TYPESCRIPT SELECT */}
            <Select value={globalAnneeFilter} onValueChange={(val: string | null) => { if (val) setGlobalAnneeFilter(val); }}>
              <SelectTrigger className="w-full md:w-50 h-10 rounded-lg font-bold border-primary/20">
                <SelectValue placeholder="Toutes les années" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold">Toutes les années</SelectItem>
                {anneesReq?.data?.map(a => <SelectItem key={a.id} value={a.libelle} className="font-bold">{a.libelle}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un prof, une matière..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-lg bg-background/50" />
          </div>
        </CardContent>
      </Card>

      {/* GRAPHIQUES & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS RAPIDES */}
        <div className="flex flex-col gap-4">
          <Card className="border-border/40 shadow-md border-l-4 border-l-primary flex-1">
            <CardHeader className="pb-2 pt-4"><CardDescription className="font-bold uppercase tracking-widest">Validées</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.valides}</div></CardContent>
          </Card>
          <Card className="border-border/40 shadow-md border-l-4 border-l-orange-500 flex-1">
            <CardHeader className="pb-2 pt-4"><CardDescription className="font-bold uppercase tracking-widest text-orange-500">En Attente</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.enAttente}</div></CardContent>
          </Card>
          <Card className="border-border/40 shadow-md border-l-4 border-l-destructive flex-1">
            <CardHeader className="pb-2 pt-4"><CardDescription className="font-bold uppercase tracking-widest text-destructive">Rejetées</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.rejetees}</div></CardContent>
          </Card>
        </div>

        {/* PIE CHART : Répartition */}
        <Card className="border-border/40 shadow-md flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center text-muted-foreground uppercase tracking-wider">
              <PieChartIcon className="w-4 h-4 mr-2" /> Répartition des Statuts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px]">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  {/* 🔥 CORRECTION TYPESCRIPT RECHARTS TOOLTIP */}
                  <RechartsTooltip formatter={(value) => `${typeof value === 'number' ? value : 0} Cours`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>}
          </CardContent>
        </Card>

        {/* BAR CHART : Top Professeurs */}
        <Card className="border-border/40 shadow-md flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center text-muted-foreground uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 mr-2" /> Top 5 Charges (Heures)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px]">
            {stats.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="heures" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Aucune attribution validée</div>}
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES ATTRIBUTIONS */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/10 py-5">
          <CardTitle className="text-xl font-black">Registre des Attributions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Professeur</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Matière / Volume (H)</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Classe / Année</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right px-6">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {loadAtt ? (
                Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>)
              ) : filteredAttributions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium">Aucune attribution ne correspond à vos filtres.</TableCell></TableRow>
              ) : (
                filteredAttributions.map((a, i) => (
                  <motion.tr key={a.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="px-6 py-4">
                      <span className="font-bold text-sm text-foreground">{a.utilisateur.nom} {a.utilisateur.prenom}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-sm">{a.matiere.nom}</span>
                        <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono text-muted-foreground">
                          {a.matiere.code} • {a.matiere.credits * RATIO_HEURES}H ({a.matiere.credits} ECTS)
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-sm">{a.classe.code}</span>
                        <span className="text-xs text-muted-foreground">{a.annee.libelle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex flex-col items-end gap-1">
                        {a.statutValidation === 'VALIDE' && <Badge className="bg-primary border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Validé</Badge>}
                        {a.statutValidation === 'PROPOSITION' && <Badge className="bg-orange-500 border-none"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>}
                        
                        {a.statutValidation === 'REJETE' && (
                          <Badge 
                            variant="destructive" 
                            className="border-none cursor-pointer hover:bg-red-600 transition-colors"
                            onClick={() => setRejectionModal({
                              isOpen: true, 
                              motif: a.motif || "Aucun motif précisé.", 
                              context: `Cours : ${a.matiere.nom} (${a.classe.code}) - Pr. ${a.utilisateur.nom}`
                            })}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Rejeté (Voir)
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              {rejectionModal.context}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 mt-2">
            <p className="text-sm font-medium text-destructive leading-relaxed">
              &quot;{rejectionModal.motif}&quot;
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setRejectionModal(prev => ({...prev, isOpen: false}))} className="w-full font-bold rounded-xl">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODALE DE PROPOSITION INDIVIDUELLE                        */}
      {/* ========================================================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-137.5 rounded-3xl border-border/40 bg-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">Nouvelle Attribution</DialogTitle>
            <DialogDescription>Assignez un cours. Le système calcule automatiquement : 1 Crédit = 15 Heures.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Année Académique</label>
              {/* 🔥 CORRECTION TYPESCRIPT SELECT */}
              <Select value={form.anneeId} onValueChange={(val) => val && setForm({...form, anneeId: val})}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50 border-border/60"><SelectValue placeholder="Choisir l'année..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {anneesReq?.data?.map(a => <SelectItem key={a.id} value={a.id.toString()} className="font-bold">{a.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Enseignant</label>
              <Select value={form.utilisateurId} onValueChange={(val) => val && setForm({...form, utilisateurId: val})}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50 border-border/60 font-bold"><SelectValue placeholder="Sélectionner un professeur..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {profsReq?.data?.map(p => (
                    <SelectItem key={p.id} value={p.id} className="font-bold">{p.nom} {p.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProf && form.anneeId && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-muted/30 p-4 rounded-2xl">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Volume Horaire Projeté</p>
                    <p className="font-black text-lg">{chargeTotaleFutureHeures} <span className="text-sm text-muted-foreground">/ {quotaMax} H</span></p>
                  </div>
                </div>
                <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden flex relative">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((chargeActuelleHeures / quotaMax) * 100, 100)}%` }} className="h-full bg-primary relative z-10" />
                  {chargeProjeteeHeures > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((chargeProjeteeHeures / quotaMax) * 100, 100)}%` }} className={`h-full relative z-10 ${isOverQuota ? 'bg-red-500' : 'bg-secondary'}`} />}
                </div>
                {isOverQuota && <p className="text-xs font-bold text-red-500 mt-2"><AlertTriangle className="w-3 h-3 inline mr-1" /> Quota dépassé !</p>}
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Matière</label>
                <Select value={form.matiereId} onValueChange={(val) => val && setForm({...form, matiereId: val})}>
                  <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Matière..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {matieresReq?.data?.map(m => <SelectItem key={m.id} value={m.id.toString()} className="font-bold">{m.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Classe</label>
                <Select value={form.classeId} onValueChange={(val) => val && setForm({...form, classeId: val})}>
                  <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Classe..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {classesReq?.data?.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold">{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-bold rounded-xl h-11" disabled={assignMutation.isPending || isOverQuota || !form.utilisateurId || !form.matiereId || !form.classeId || !form.anneeId}>
                {assignMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Soumettre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODALE DE RECONDUCTION ANNUELLE                           */}
      {/* ========================================================= */}
      <Dialog open={isReconductionModalOpen} onOpenChange={setIsReconductionModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Reconduction Annuelle</DialogTitle>
            <DialogDescription>Copiez les attributions Validées vers la nouvelle année.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReconductionSubmit} className="space-y-4 pt-2">
             <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Année Source</label>
              <Select value={reconductionForm.anneeSourceId} onValueChange={(val) => val && setReconductionForm({...reconductionForm, anneeSourceId: val})}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {anneesReq?.data?.map(a => <SelectItem key={a.id} value={a.id.toString()} className="font-bold">{a.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Année Cible</label>
              <Select value={reconductionForm.anneeCibleId} onValueChange={(val) => val && setReconductionForm({...reconductionForm, anneeCibleId: val})}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {anneesReq?.data?.map(a => <SelectItem key={a.id} value={a.id.toString()} className="font-bold">{a.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full font-bold rounded-xl h-11 bg-secondary text-secondary-foreground" disabled={reconductionMutation.isPending || !reconductionForm.anneeSourceId || !reconductionForm.anneeCibleId}>
                {reconductionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Lancer la Reconduction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}