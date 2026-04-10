'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  Layers, BookOpen, Plus, Trash2, Loader2, Building2, BookPlus, User, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS ALIGNÉS SUR LE BACKEND
// ==========================================
interface Institut { id: number; nom: string; }
interface Utilisateur { id: string; nom: string; prenom: string; role: { libelle: string } }
interface Departement { 
  id: number; 
  nom: string; 
  institut: { nom: string }; 
  utilisateurs?: { id: string; nom: string; prenom: string }[]; 
  _count?: { classes: number; matieres: number }; 
}
interface Matiere { id: number; code: string; nom: string; credits: number; semestre: string; }
interface ApiResponse<T> { success: boolean; data: T; message?: string }

// 🔥 CORRECTION TYPESCRIPT : On supprime le `any` et on définit précisément le payload
interface AddMatierePayload {
  code: string;
  nom: string;
  credits: number;
  semestre: string;
  departementId: number;
}

const SEMESTRES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export default function AdminStructurePage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // 🔥 CORRECTION ESLINT : Montage asynchrone
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- ÉTATS MODALES CONTRÔLÉES ---
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);
  const [depForm, setDepForm] = useState({ nom: '', institutId: '', chefId: '' });

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matForm, setMatForm] = useState({ code: '', nom: '', credits: '', semestre: '', departementId: '' });

  // --- REQUÊTES API ---
  const { data: instsReq } = useQuery({ queryKey: ['instituts'], queryFn: () => fetchApi<ApiResponse<Institut[]>>('/instituts') });
  const { data: depsReq, isLoading: loadDeps, isError: errDeps } = useQuery({ queryKey: ['departements'], queryFn: () => fetchApi<ApiResponse<Departement[]>>('/structure/departements') });
  const { data: matsReq, isLoading: loadMats } = useQuery({ queryKey: ['matieres'], queryFn: () => fetchApi<ApiResponse<Matiere[]>>('/structure/matieres') });
  const { data: usersReq } = useQuery({ queryKey: ['admin-utilisateurs'], queryFn: () => fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs') });
  
  // --- LOGIQUE MÉTIER : 1 CHEF = 1 DÉPARTEMENT EXCLUSIF ---
  const assignedChefIds = new Set(depsReq?.data?.flatMap(d => d.utilisateurs?.map(u => u.id) || []) || []);
  const listChefs = usersReq?.data?.filter(u => u.role.libelle === 'CHEF_DEPARTEMENT') || [];
  const availableChefs = listChefs.filter(c => !assignedChefIds.has(c.id));

  // --- MUTATIONS ---
  const addDepMutation = useMutation({
    mutationFn: (payload: { nom: string, institutId: number, chefId: string }) => fetchApi<ApiResponse<unknown>>('/structure/departements', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Département créé');
      setIsDepModalOpen(false);
      setDepForm({ nom: '', institutId: '', chefId: '' });
      queryClient.invalidateQueries({ queryKey: ['departements'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // 🔥 CORRECTION TYPESCRIPT : Remplacement de "any" par "AddMatierePayload"
  const addMatMutation = useMutation({
    mutationFn: (payload: AddMatierePayload) => fetchApi<ApiResponse<unknown>>('/structure/matieres', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Matière ajoutée');
      setIsMatModalOpen(false);
      setMatForm({ code: '', nom: '', credits: '', semestre: '', departementId: '' });
      queryClient.invalidateQueries({ queryKey: ['matieres'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: 'departements' | 'matieres', id: number }) => fetchApi(`/structure/${type}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Élément supprimé avec succès');
      queryClient.invalidateQueries();
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
            Structure Académique
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Gérez les départements, le catalogue des matières et les assignations de direction.
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="departements" className="w-full">
        {/* TABS DESIGN SAAS */}
        <TabsList className="bg-card/80 backdrop-blur-xl border border-border/40 h-14 p-1.5 rounded-2xl mb-6 shadow-sm inline-flex">
          <TabsTrigger value="departements" className="rounded-xl px-6 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Layers className="w-4 h-4" /> Départements
          </TabsTrigger>
          <TabsTrigger value="matieres" className="rounded-xl px-6 font-bold gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-md transition-all">
            <BookOpen className="w-4 h-4" /> Catalogue Matières
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* ONGLET : DÉPARTEMENTS                                     */}
        {/* ========================================================= */}
        <TabsContent value="departements" className="outline-none focus:ring-0">
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/40 bg-muted/10 py-5">
              <div>
                <CardTitle className="text-xl font-black">Départements & Directions</CardTitle>
                <CardDescription className="font-medium mt-1">Liste des départements rattachés aux instituts.</CardDescription>
              </div>
              <Button 
                onClick={() => setIsDepModalOpen(true)}
                className="h-10 rounded-xl px-4 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" /> Nouveau Département
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">Département</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Institut</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Chef de Département</TableHead>
                    <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadDeps ? (
                    Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell></TableRow>)
                  ) : errDeps ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 h-10 w-10 opacity-50" /><p className="font-bold">Erreur de chargement</p></TableCell></TableRow>
                  ) : depsReq?.data?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium">Aucun département configuré.</TableCell></TableRow>
                  ) : (
                    depsReq?.data?.map((d, i) => (
                      <motion.tr key={d.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors group">
                        <TableCell className="px-6 font-black text-foreground text-sm py-4">{d.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 font-bold px-2 py-1 rounded-md">{d.institut.nom}</Badge>
                        </TableCell>
                        <TableCell>
                          {d.utilisateurs && d.utilisateurs.length > 0 ? (
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <div className="p-1.5 bg-secondary/10 rounded-md text-secondary"><User className="h-3.5 w-3.5" /></div>
                              {d.utilisateurs[0].nom} {d.utilisateurs[0].prenom}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-500 bg-orange-500/10 border-orange-500/20 font-bold">Non assigné</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8" onClick={() => { if(confirm('Supprimer ce département de façon permanente ?')) deleteMutation.mutate({ type: 'departements', id: d.id }); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ONGLET : MATIÈRES                                         */}
        {/* ========================================================= */}
        <TabsContent value="matieres" className="outline-none focus:ring-0">
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/40 bg-muted/10 py-5">
              <div>
                <CardTitle className="text-xl font-black">Catalogue des Matières</CardTitle>
                <CardDescription className="font-medium mt-1">Gérez l&apos;offre de formation de l&apos;établissement.</CardDescription>
              </div>
              <Button 
                onClick={() => setIsMatModalOpen(true)}
                className="h-10 rounded-xl px-4 font-bold shadow-lg shadow-secondary/20 transition-all hover:scale-105 active:scale-95 bg-secondary text-secondary-foreground"
              >
                <BookPlus className="h-4 w-4 mr-2" /> Nouvelle Matière
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground py-4">Code</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Intitulé</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Crédits</TableHead>
                    <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadMats ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell></TableRow>)
                  ) : matsReq?.data?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium">Aucune matière dans le catalogue.</TableCell></TableRow>
                  ) : (
                    matsReq?.data?.map((m, i) => (
                      <motion.tr key={m.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors group">
                        <TableCell className="px-6 py-4">
                           <Badge variant="outline" className="font-mono text-xs font-black text-secondary bg-secondary/10 border-secondary/20 uppercase px-2 py-1">
                             {m.code}
                           </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-foreground">{m.nom}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-black text-primary bg-primary/10 w-max px-2 py-1 rounded-md text-xs">
                            {m.credits} ECTS
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8" onClick={() => { if(confirm('Retirer cette matière du catalogue ?')) deleteMutation.mutate({ type: 'matieres', id: m.id }); }}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODALES CONTRÔLÉES (SÉCURITÉ SHADCN & TYPESCRIPT)         */}
      {/* ========================================================= */}

      {/* MODALE DÉPARTEMENT */}
      <Dialog open={isDepModalOpen} onOpenChange={setIsDepModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-border/40 bg-card/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">Créer un Département</DialogTitle>
            <DialogDescription>Associez-le à un institut et nommez son Chef.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5 pt-4" onSubmit={(e) => { 
            e.preventDefault(); 
            if(!depForm.chefId) return toast.error('Veuillez assigner un Chef de Département');
            if(!depForm.institutId) return toast.error('Veuillez sélectionner un institut');
            addDepMutation.mutate({ nom: depForm.nom.toUpperCase(), institutId: Number(depForm.institutId), chefId: depForm.chefId }); 
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Nom du Département</label>
              <Input placeholder="Ex: INFORMATIQUE" required value={depForm.nom} onChange={e => setDepForm({...depForm, nom: e.target.value})} className="rounded-xl h-11 bg-background/50 border-border/60" />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Institut de Tutelle</label>
              <Select value={depForm.institutId} onValueChange={v => { if(v) setDepForm({...depForm, institutId: v}) }}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50 border-border/60"><SelectValue placeholder="Choisir l'institut..." /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">{instsReq?.data?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Direction (Chef exclusif)</label>
              <Select value={depForm.chefId} onValueChange={v => { if(v) setDepForm({...depForm, chefId: v}) }}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50 border-border/60"><SelectValue placeholder="Assigner un profil..." /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">
                  {availableChefs.length === 0 ? (
                     <SelectItem value="none" disabled>Aucun Chef disponible</SelectItem>
                  ) : (
                     availableChefs.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.nom} {c.prenom}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
              {availableChefs.length === 0 && <p className="text-xs text-orange-500 font-medium ml-1">Tous les Chefs de Dép. gèrent déjà un département.</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full font-bold rounded-xl h-11 shadow-lg shadow-primary/20" disabled={addDepMutation.isPending}>
                {addDepMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Enregistrer le Département"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE MATIÈRE */}
      <Dialog open={isMatModalOpen} onOpenChange={setIsMatModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-border/40 bg-card/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-secondary">Ajouter une Matière</DialogTitle>
            <DialogDescription>Enrichissez le catalogue pédagogique.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5 pt-4" onSubmit={(e) => { 
            e.preventDefault(); 
            if(!matForm.departementId || !matForm.semestre) return toast.error('Veuillez remplir tous les menus déroulants');
            addMatMutation.mutate({ ...matForm, credits: Number(matForm.credits), departementId: Number(matForm.departementId) }); 
          }}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Code</label>
                <Input placeholder="ALG101" required value={matForm.code} onChange={e => setMatForm({...matForm, code: e.target.value.toUpperCase()})} className="rounded-xl h-11 uppercase font-mono bg-background/50" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Intitulé Complet</label>
                <Input placeholder="Algorithmique Avancée" required value={matForm.nom} onChange={e => setMatForm({...matForm, nom: e.target.value})} className="rounded-xl h-11 bg-background/50" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">ECTS / Heures</label>
                <Input type="number" placeholder="Ex: 4" min="1" required value={matForm.credits} onChange={e => setMatForm({...matForm, credits: e.target.value})} className="rounded-xl h-11 bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Semestre</label>
                <Select value={matForm.semestre} onValueChange={v => { if(v) setMatForm({...matForm, semestre: v}) }}>
                  <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Période" /></SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">{SEMESTRES.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Rattachement</label>
              <Select value={matForm.departementId} onValueChange={v => { if(v) setMatForm({...matForm, departementId: v}) }}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Département responsable..." /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">{depsReq?.data?.map(d => <SelectItem key={d.id} value={d.id.toString()} className="font-bold">{d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full font-bold rounded-xl h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/20" disabled={addMatMutation.isPending}>
                {addMatMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Ajouter au catalogue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}