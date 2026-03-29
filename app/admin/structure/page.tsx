'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Building2, Layers, GraduationCap, School, BookOpen, Loader2, Plus, Edit, Trash2, MoreHorizontal, AlertTriangle, CalendarDays, BookPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';

// ==========================================
// 1. INTERFACES
// ==========================================
interface Institut { id: number; nom: string; adresse: string | null; _count?: { utilisateurs: number; filieres: number }; }
interface Filiere { id: number; nom: string; instituts?: { id: number, nom: string }[]; _count?: { classes: number; matieres: number }; }
interface Niveau { id: number; libelle: string; }
interface Classe { id: number; code: string; filiereId: number; niveauId: number; filiere: { nom: string }; niveau: { libelle: string }; _count?: { courses: number }; }
interface Matiere { id: number; code: string; nom: string; credits: number; semestre: string; filiereId: number; filiere: { nom: string }; }
interface Annee { id: number; libelle: string; }
interface Course { id: string; matiere: { nom: string; code: string; semestre: string; credits: number }; classe: { code: string }; annee: { libelle: string }; }
interface ApiResponse<T> { success: boolean; data: T; message?: string }

// ==========================================
// 2. FORMULAIRES
// ==========================================
interface InstForm { nom: string; adresse: string }
interface FilForm { nom: string; institutId: string }
interface NivForm { libelle: string }
interface ClsForm { code: string; filiereId: string; niveauId: string; shift: string; groupe: string }
interface MatForm { code: string; nom: string; credits: string; semestre: string; filiereId: string }
interface AnneeForm { libelle: string }
interface CourseForm { matiereId: string; classeId: string; anneeId: string }

type EditInstForm = InstForm & { id: number };
type EditFilForm = FilForm & { id: number };
type EditNivForm = NivForm & { id: number };
type EditClsForm = ClsForm & { id: number };
type EditMatForm = MatForm & { id: number };
type DeleteTarget = { id: number | string; type: 'inst' | 'fil' | 'niv' | 'cls' | 'mat' | 'annee' | 'course' };

const SEMESTRES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const SHIFTS = [{ id: 'J', label: 'Jour' }, { id: 'S', label: 'Soir' }];
const GROUPES = [{ id: '', label: 'Aucun (Par défaut)' }, { id: 'A', label: 'Groupe A' }, { id: 'B', label: 'Groupe B' }, { id: 'C', label: 'Groupe C' }];

const generateClassCode = (filiereNom: string, niveauLibelle: string, shift: string, groupe: string = ''): string => {
  const upperNom = filiereNom.toUpperCase();
  let acronym = '';
  if (upperNom.includes('SOFTWARE ENGINEERING')) acronym = 'SWE';
  else {
    const stopWords = ['ET', 'DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'EN', 'POUR', 'A', 'À', 'AND', 'OF', 'THE', 'FOR', 'IN'];
    const words = upperNom.replace(/[^A-ZÀ-Ÿ\s]/g, '').split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 0);
    acronym = words.length === 1 ? words[0].substring(0, 3).toUpperCase() : words.map(w => w[0]).join('');
  }
  const numMatch = niveauLibelle.match(/\d+/);
  const num = numMatch ? numMatch[0] : '';
  return `${acronym}${num}${groupe}${shift}`; 
};

export default function StructurePage() {
  const queryClient = useQueryClient();

  const [openInst, setOpenInst] = useState<boolean>(false); const [instForm, setInstForm] = useState<InstForm>({ nom: '', adresse: '' });
  const [openFil, setOpenFil] = useState<boolean>(false); const [filForm, setFilForm] = useState<FilForm>({ nom: '', institutId: '' });
  const [openNiv, setOpenNiv] = useState<boolean>(false); const [nivForm, setNivForm] = useState<NivForm>({ libelle: '' });
  const [openCls, setOpenCls] = useState<boolean>(false); const [clsForm, setClsForm] = useState<ClsForm>({ code: '', filiereId: '', niveauId: '', shift: 'J', groupe: '' });
  const [openMat, setOpenMat] = useState<boolean>(false); const [matForm, setMatForm] = useState<MatForm>({ code: '', nom: '', credits: '', semestre: '', filiereId: '' });
  const [openAnnee, setOpenAnnee] = useState<boolean>(false); const [anneeForm, setAnneeForm] = useState<AnneeForm>({ libelle: '' });
  const [openCourse, setOpenCourse] = useState<boolean>(false); const [courseForm, setCourseForm] = useState<CourseForm>({ matiereId: '', classeId: '', anneeId: '' });

  const [editInstOpen, setEditInstOpen] = useState<boolean>(false); const [editInst, setEditInst] = useState<EditInstForm | null>(null);
  const [editFilOpen, setEditFilOpen] = useState<boolean>(false); const [editFil, setEditFil] = useState<EditFilForm | null>(null);
  const [editNivOpen, setEditNivOpen] = useState<boolean>(false); const [editNiv, setEditNiv] = useState<EditNivForm | null>(null);
  const [editClsOpen, setEditClsOpen] = useState<boolean>(false); const [editCls, setEditCls] = useState<EditClsForm | null>(null);
  const [editMatOpen, setEditMatOpen] = useState<boolean>(false); const [editMat, setEditMat] = useState<EditMatForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: institutsReq, isLoading: loadInst } = useQuery({ queryKey: ['instituts'], queryFn: () => fetchApi<ApiResponse<Institut[]>>('/instituts') });
  const { data: filieresReq, isLoading: loadFil } = useQuery({ queryKey: ['filieres'], queryFn: () => fetchApi<ApiResponse<Filiere[]>>('/structure/filieres') });
  const { data: niveauxReq, isLoading: loadNiv } = useQuery({ queryKey: ['niveaux'], queryFn: () => fetchApi<ApiResponse<Niveau[]>>('/structure/niveaux') });
  const { data: classesReq, isLoading: loadCls } = useQuery({ queryKey: ['classes'], queryFn: () => fetchApi<ApiResponse<Classe[]>>('/structure/classes') });
  const { data: matieresReq, isLoading: loadMat } = useQuery({ queryKey: ['matieres'], queryFn: () => fetchApi<ApiResponse<Matiere[]>>('/structure/matieres') });
  const { data: anneesReq, isLoading: loadAnnees } = useQuery({ queryKey: ['annees'], queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') });
  const { data: coursesReq, isLoading: loadCourses } = useQuery({ queryKey: ['courses-structure'], queryFn: () => fetchApi<ApiResponse<Course[]>>('/structure/courses') });

  const handleClasseChange = (field: keyof ClsForm, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (!editCls) return;
      const newForm: EditClsForm = { ...editCls, [field]: value };
      if (newForm.filiereId && newForm.niveauId) {
        const fil = filieresReq?.data?.find(f => f.id.toString() === newForm.filiereId);
        const niv = niveauxReq?.data?.find(n => n.id.toString() === newForm.niveauId);
        if (fil && niv) newForm.code = generateClassCode(fil.nom, niv.libelle, newForm.shift, newForm.groupe);
      }
      setEditCls(newForm);
    } else {
      const newForm: ClsForm = { ...clsForm, [field]: value };
      if (newForm.filiereId && newForm.niveauId) {
        const fil = filieresReq?.data?.find(f => f.id.toString() === newForm.filiereId);
        const niv = niveauxReq?.data?.find(n => n.id.toString() === newForm.niveauId);
        if (fil && niv) newForm.code = generateClassCode(fil.nom, niv.libelle, newForm.shift, newForm.groupe);
      }
      setClsForm(newForm);
    }
  };

  function useCreateMutation<TVar>(url: string, queryKey: string, setOpen: (v: boolean) => void, resetForm: () => void) {
    return useMutation({
      mutationFn: (data: TVar) => fetchApi<ApiResponse<unknown>>(url, { method: 'POST', body: JSON.stringify(data) }),
      onSuccess: (res) => { toast.success(res.message || 'Créé avec succès'); setOpen(false); resetForm(); queryClient.invalidateQueries({ queryKey: [queryKey] }); },
      onError: (err: Error) => toast.error(err.message)
    });
  }

  function useUpdateMutation<TVar>(urlFunc: (id: number) => string, queryKey: string, setOpen: (v: boolean) => void) {
    return useMutation({
      mutationFn: (data: { id: number, payload: TVar }) => fetchApi<ApiResponse<unknown>>(urlFunc(data.id), { method: 'PATCH', body: JSON.stringify(data.payload) }),
      onSuccess: (res) => { toast.success(res.message || 'Modifié avec succès'); setOpen(false); queryClient.invalidateQueries({ queryKey: [queryKey] }); },
      onError: (err: Error) => toast.error(err.message)
    });
  }

  const addInst = useCreateMutation<InstForm>('/instituts', 'instituts', setOpenInst, () => setInstForm({ nom: '', adresse: '' }));
  const addFil = useCreateMutation<{ nom: string, institutId: number }>('/structure/filieres', 'filieres', setOpenFil, () => setFilForm({ nom: '', institutId: '' }));
  const handleAddFil = (e: React.FormEvent) => { e.preventDefault(); addFil.mutate({ nom: filForm.nom, institutId: Number(filForm.institutId) }); };
  const addNiv = useCreateMutation<NivForm>('/structure/niveaux', 'niveaux', setOpenNiv, () => setNivForm({ libelle: '' }));
  const addCls = useCreateMutation<{ code: string, filiereId: number, niveauId: number }>('/structure/classes', 'classes', setOpenCls, () => setClsForm({ code: '', filiereId: '', niveauId: '', shift: 'J', groupe: '' }));
  const addMat = useCreateMutation<{ code: string, nom: string, credits: number, semestre: string, filiereId: number }>('/structure/matieres', 'matieres', setOpenMat, () => setMatForm({ code: '', nom: '', credits: '', semestre: '', filiereId: '' }));
  const addAnnee = useCreateMutation<AnneeForm>('/structure/annees', 'annees', setOpenAnnee, () => setAnneeForm({ libelle: '' }));
  const addCourse = useCreateMutation<{ matiereId: number, classeId: number, anneeId: number }>('/structure/courses', 'courses-structure', setOpenCourse, () => setCourseForm({ matiereId: '', classeId: '', anneeId: '' }));

  const updInst = useUpdateMutation<Partial<InstForm>>(id => `/instituts/${id}`, 'instituts', setEditInstOpen);
  const updFil = useUpdateMutation<{ nom: string, institutId: number }>(id => `/structure/filieres/${id}`, 'filieres', setEditFilOpen);
  const handleEditFil = (e: React.FormEvent) => { e.preventDefault(); if (editFil) updFil.mutate({ id: editFil.id, payload: { nom: editFil.nom, institutId: Number(editFil.institutId) } }); };
  const updNiv = useUpdateMutation<Partial<NivForm>>(id => `/structure/niveaux/${id}`, 'niveaux', setEditNivOpen);
  const updCls = useUpdateMutation<{ code: string, filiereId: number, niveauId: number }>(id => `/structure/classes/${id}`, 'classes', setEditClsOpen);
  const updMat = useUpdateMutation<{ code: string, nom: string, credits: number, semestre: string, filiereId: number }>(id => `/structure/matieres/${id}`, 'matieres', setEditMatOpen);

  const delMutation = useMutation({
    mutationFn: ({ url }: { url: string }) => fetchApi<ApiResponse<null>>(url, { method: 'DELETE' }),
    onSuccess: (res) => { toast.success(res.message || 'Supprimé avec succès'); setDeleteTarget(null); queryClient.invalidateQueries(); },
    onError: (err: Error) => { toast.error(err.message); setDeleteTarget(null); }
  });
  const confirmDelete = () => { if (!deleteTarget) return; const routes: Record<string, string> = { inst: '/instituts', fil: '/structure/filieres', niv: '/structure/niveaux', cls: '/structure/classes', mat: '/structure/matieres', annee: '/structure/annees', course: '/structure/courses' }; delMutation.mutate({ url: `${routes[deleteTarget.type]}/${deleteTarget.id}` }); };

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = (cols: number) => Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={cols} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground">Structure Académique</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Configurez l&lsquo;intégralité du programme académique de l&lsquo;IUG.</p>
      </motion.div>

      <Tabs defaultValue="annees" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="annees" className="rounded-xl px-4 py-2 font-bold"><CalendarDays className="w-4 h-4 mr-2" /> Années</TabsTrigger>
            <TabsTrigger value="instituts" className="rounded-xl px-4 py-2 font-bold"><Building2 className="w-4 h-4 mr-2" /> Instituts</TabsTrigger>
            <TabsTrigger value="filieres" className="rounded-xl px-4 py-2 font-bold"><Layers className="w-4 h-4 mr-2" /> Filières</TabsTrigger>
            <TabsTrigger value="niveaux" className="rounded-xl px-4 py-2 font-bold"><GraduationCap className="w-4 h-4 mr-2" /> Niveaux</TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl px-4 py-2 font-bold"><School className="w-4 h-4 mr-2" /> Classes</TabsTrigger>
            <TabsTrigger value="matieres" className="rounded-xl px-4 py-2 font-bold"><BookOpen className="w-4 h-4 mr-2" /> Matières</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl px-4 py-2 font-bold bg-primary/10 text-primary"><BookPlus className="w-4 h-4 mr-2" /> Programme (Cours)</TabsTrigger>
          </TabsList>
        </div>

        {/* --- ONGLET: ANNEES --- */}
        <TabsContent value="annees" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Années Académiques</CardTitle>
              <Dialog open={openAnnee} onOpenChange={setOpenAnnee}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Ajouter</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-100">
                  <DialogHeader><DialogTitle>Nouvelle Année</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addAnnee.mutate(anneeForm); }} className="space-y-4 pt-4">
                    <Input placeholder="Ex: 2025-2026" required value={anneeForm.libelle} onChange={e => setAnneeForm({libelle: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                    <Button type="submit" disabled={addAnnee.isPending} className="w-full rounded-xl font-bold h-12">Créer l&apos;Année</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow><TableHead className="font-bold px-6 py-4">Libellé</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loadAnnees ? renderSkeletons(2) : anneesReq?.data?.map((a, i) => (
                    <motion.tr key={a.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold text-primary">{a.libelle}</TableCell>
                      <TableCell className="text-right px-6">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: a.id, type: 'annee' })} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ONGLET: INSTITUTS --- */}
        <TabsContent value="instituts" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Instituts</CardTitle>
              <Dialog open={openInst} onOpenChange={setOpenInst}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Ajouter</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
                  <DialogHeader><DialogTitle>Nouvel Institut</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addInst.mutate(instForm); }} className="space-y-4 pt-4">
                    <Input placeholder="Nom (ex: ISA)" required minLength={3} value={instForm.nom} onChange={e => setInstForm({...instForm, nom: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                    <Input placeholder="Adresse" value={instForm.adresse} onChange={e => setInstForm({...instForm, adresse: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                    <Button type="submit" disabled={addInst.isPending} className="w-full rounded-xl font-bold h-12 text-md">Créer l&lsquo;Institut</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">Nom</TableHead><TableHead>Adresse</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadInst ? renderSkeletons(3) : institutsReq?.data?.map((inst, i) => (
                    <motion.tr key={inst.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold">{inst.nom}</TableCell><TableCell>{inst.adresse || '-'}</TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 outline-none"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { setEditInst({ id: inst.id, nom: inst.nom, adresse: inst.adresse || '' }); setEditInstOpen(true); }} className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget({ id: inst.id, type: 'inst' })} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
                          </DropdownMenuGroup></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={editInstOpen} onOpenChange={setEditInstOpen}>
            <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
              <DialogHeader><DialogTitle>Modifier l&rsquo;Institut</DialogTitle></DialogHeader>
              {editInst && (
                <form onSubmit={e => { e.preventDefault(); updInst.mutate({ id: editInst.id, payload: { nom: editInst.nom, adresse: editInst.adresse } }); }} className="space-y-4 pt-4">
                  <Input required minLength={3} value={editInst.nom} onChange={e => setEditInst({...editInst, nom: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                  <Input placeholder="Adresse" value={editInst.adresse} onChange={e => setEditInst({...editInst, adresse: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                  <Button type="submit" disabled={updInst.isPending} className="w-full rounded-xl font-bold h-12 text-md">Enregistrer</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- ONGLET: FILIERES --- */}
        <TabsContent value="filieres" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Filières</CardTitle>
              <Dialog open={openFil} onOpenChange={setOpenFil}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Ajouter</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
                  <DialogHeader><DialogTitle>Nouvelle Filière</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddFil} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Institut de rattachement</label>
                      <Select value={filForm.institutId} onValueChange={(val: string | null) => { if(val) setFilForm({...filForm, institutId: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Choisir un institut">
                            {filForm.institutId ? institutsReq?.data?.find(i => i.id.toString() === filForm.institutId)?.nom : "Choisir un institut"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{institutsReq?.data?.map(inst => <SelectItem key={inst.id} value={inst.id.toString()}>{inst.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Nom de la filière</label>
                      <Input placeholder="Ex: GÉNIE LOGICIEL" required minLength={3} value={filForm.nom} onChange={e => setFilForm({...filForm, nom: e.target.value})} className="rounded-xl uppercase bg-background/50 h-12" />
                    </div>
                    <Button type="submit" disabled={addFil.isPending || !filForm.institutId} className="w-full rounded-xl font-bold h-12 text-md">Créer la Filière</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">Nom</TableHead><TableHead>Institut</TableHead><TableHead className="text-center">Classes</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadFil ? renderSkeletons(4) : filieresReq?.data?.map((fil, i) => (
                    <motion.tr key={fil.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold">{fil.nom}</TableCell>
                      <TableCell>
                        {fil.instituts && fil.instituts.length > 0 ? <Badge variant="outline" className="border-primary/30 text-primary">{fil.instituts[0].nom}</Badge> : <span className="text-muted-foreground italic text-xs">Non assigné</span>}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{fil._count?.classes || 0}</Badge></TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 outline-none"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { setEditFil({ id: fil.id, nom: fil.nom, institutId: fil.instituts && fil.instituts.length > 0 ? fil.instituts[0].id.toString() : '' }); setEditFilOpen(true); }} className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget({ id: fil.id, type: 'fil' })} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
                          </DropdownMenuGroup></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={editFilOpen} onOpenChange={setEditFilOpen}>
            <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
              <DialogHeader><DialogTitle>Modifier la Filière</DialogTitle></DialogHeader>
              {editFil && (
                <form onSubmit={handleEditFil} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Institut de rattachement</label>
                    <Select value={editFil.institutId} onValueChange={(val: string | null) => { if(val) setEditFil({...editFil, institutId: val}) }}>
                      <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                        <SelectValue placeholder="Choisir un institut">{editFil.institutId ? institutsReq?.data?.find(i => i.id.toString() === editFil.institutId)?.nom : "Sélectionner"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-200">{institutsReq?.data?.map(inst => <SelectItem key={inst.id} value={inst.id.toString()}>{inst.nom}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Nom de la filière</label>
                    <Input required minLength={3} value={editFil.nom} onChange={e => setEditFil({...editFil, nom: e.target.value})} className="rounded-xl uppercase bg-background/50 h-12" />
                  </div>
                  <Button type="submit" disabled={updFil.isPending || !editFil.institutId} className="w-full rounded-xl font-bold h-12 text-md">Enregistrer</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- ONGLET: NIVEAUX --- */}
        <TabsContent value="niveaux" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Niveaux</CardTitle>
              <Dialog open={openNiv} onOpenChange={setOpenNiv}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Ajouter</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
                  <DialogHeader><DialogTitle>Nouveau Niveau</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addNiv.mutate(nivForm); }} className="space-y-4 pt-4">
                    <Input placeholder="Libellé (ex: HND 1)" required value={nivForm.libelle} onChange={e => setNivForm({libelle: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                    <Button type="submit" disabled={addNiv.isPending} className="w-full rounded-xl font-bold h-12 text-md">Créer le Niveau</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">ID</TableHead><TableHead>Libellé</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadNiv ? renderSkeletons(3) : niveauxReq?.data?.map((niv, i) => (
                    <motion.tr key={niv.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-mono text-xs text-muted-foreground">#{niv.id}</TableCell><TableCell className="font-bold">{niv.libelle}</TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 outline-none"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { setEditNiv({ id: niv.id, libelle: niv.libelle }); setEditNivOpen(true); }} className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget({ id: niv.id, type: 'niv' })} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
                          </DropdownMenuGroup></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={editNivOpen} onOpenChange={setEditNivOpen}>
            <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
              <DialogHeader><DialogTitle>Modifier le Niveau</DialogTitle></DialogHeader>
              {editNiv && (
                <form onSubmit={e => { e.preventDefault(); updNiv.mutate({ id: editNiv.id, payload: { libelle: editNiv.libelle } }); }} className="space-y-4 pt-4">
                  <Input required value={editNiv.libelle} onChange={e => setEditNiv({...editNiv, libelle: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                  <Button type="submit" disabled={updNiv.isPending} className="w-full rounded-xl font-bold h-12 text-md">Enregistrer</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- ONGLET: CLASSES --- */}
        <TabsContent value="classes" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Classes</CardTitle>
              <Dialog open={openCls} onOpenChange={setOpenCls}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Générer</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-150">
                  <DialogHeader><DialogTitle>Générer une Classe</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addCls.mutate({ code: clsForm.code, filiereId: Number(clsForm.filiereId), niveauId: Number(clsForm.niveauId) }); }} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">1. Filière</label>
                        <Select onValueChange={(val: string | null) => { if(val) handleClasseChange('filiereId', val) }}>
                          <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                            <SelectValue placeholder="Filière">{clsForm.filiereId ? filieresReq?.data?.find(f => f.id.toString() === clsForm.filiereId)?.nom : "Filière"}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-200">{filieresReq?.data?.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">2. Niveau</label>
                        <Select onValueChange={(val: string | null) => { if(val) handleClasseChange('niveauId', val) }}>
                          <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                            <SelectValue placeholder="Niveau">{clsForm.niveauId ? niveauxReq?.data?.find(n => n.id.toString() === clsForm.niveauId)?.libelle : "Niveau"}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-200">{niveauxReq?.data?.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.libelle}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Groupe (Optionnel)</label>
                        <Select value={clsForm.groupe} onValueChange={(val: string | null) => { if(val !== null) handleClasseChange('groupe', val) }}>
                          <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full"><SelectValue placeholder="Groupe" /></SelectTrigger>
                          <SelectContent className="z-200">{GROUPES.map(g => <SelectItem key={g.label} value={g.id}>{g.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Vacation</label>
                        <Select value={clsForm.shift} onValueChange={(val: string | null) => { if(val) handleClasseChange('shift', val) }}>
                          <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full"><SelectValue placeholder="Vacation" /></SelectTrigger>
                          <SelectContent className="z-200">{SHIFTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="pt-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Code Éditable</label>
                      <Input value={clsForm.code} onChange={e => setClsForm({...clsForm, code: e.target.value.toUpperCase()})} className="rounded-xl font-black text-center text-primary border-primary bg-primary/5 h-14 text-xl tracking-widest uppercase mt-1" />
                    </div>
                    <Button type="submit" disabled={!clsForm.code || addCls.isPending} className="w-full rounded-xl font-bold h-12 text-md">Créer la classe {clsForm.code}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">Code</TableHead><TableHead>Filière</TableHead><TableHead>Niveau</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadCls ? renderSkeletons(4) : classesReq?.data?.map((cls, i) => (
                    <motion.tr key={cls.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold text-primary">{cls.code}</TableCell><TableCell>{cls.filiere.nom}</TableCell><TableCell><Badge variant="outline">{cls.niveau.libelle}</Badge></TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 outline-none"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { setEditCls({ id: cls.id, code: cls.code, filiereId: cls.filiereId.toString(), niveauId: cls.niveauId.toString(), shift: '', groupe: '' }); setEditClsOpen(true); }} className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget({ id: cls.id, type: 'cls' })} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
                          </DropdownMenuGroup></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={editClsOpen} onOpenChange={setEditClsOpen}>
            <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
              <DialogHeader><DialogTitle>Modifier la Classe</DialogTitle></DialogHeader>
              {editCls && (
                <form onSubmit={e => { e.preventDefault(); updCls.mutate({ id: editCls.id, payload: { code: editCls.code, filiereId: Number(editCls.filiereId), niveauId: Number(editCls.niveauId) } }); }} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Filière</label>
                      <Select value={editCls.filiereId} onValueChange={(val: string | null) => { if(val) handleClasseChange('filiereId', val, true) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Filière">{editCls.filiereId ? filieresReq?.data?.find(f => f.id.toString() === editCls.filiereId)?.nom : "Filière"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{filieresReq?.data?.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Niveau</label>
                      <Select value={editCls.niveauId} onValueChange={(val: string | null) => { if(val) handleClasseChange('niveauId', val, true) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Niveau">{editCls.niveauId ? niveauxReq?.data?.find(n => n.id.toString() === editCls.niveauId)?.libelle : "Niveau"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{niveauxReq?.data?.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.libelle}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input value={editCls.code} onChange={e => setEditCls({...editCls, code: e.target.value.toUpperCase()})} className="rounded-xl font-black text-center bg-background/50 h-12 text-lg tracking-widest uppercase" />
                  <Button type="submit" disabled={updCls.isPending} className="w-full rounded-xl font-bold h-12 text-md">Enregistrer</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- ONGLET: MATIERES --- */}
        <TabsContent value="matieres" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Matières</CardTitle>
              <Dialog open={openMat} onOpenChange={setOpenMat}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Ajouter</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-150">
                  <DialogHeader><DialogTitle>Nouvelle Matière</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addMat.mutate({ code: matForm.code, nom: matForm.nom, credits: Number(matForm.credits), semestre: matForm.semestre, filiereId: Number(matForm.filiereId) }); }} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5 sm:col-span-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Code</label>
                        <Input className="rounded-xl bg-background/50 h-12" placeholder="Ex: MTH101" required value={matForm.code} onChange={e => setMatForm({...matForm, code: e.target.value})} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Nom de la matière</label>
                        <Input className="rounded-xl bg-background/50 h-12" placeholder="Nom de la matière" required value={matForm.nom} onChange={e => setMatForm({...matForm, nom: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Crédits</label>
                        <Input type="number" min="1" max="30" placeholder="Ex: 4" required value={matForm.credits} onChange={e => setMatForm({...matForm, credits: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Semestre</label>
                        <Select onValueChange={(val: string | null) => { if(val) setMatForm({...matForm, semestre: val}) }}>
                          <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full"><SelectValue placeholder="Semestre" /></SelectTrigger>
                          <SelectContent className="z-200">{SEMESTRES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Filière de rattachement</label>
                      <Select onValueChange={(val: string | null) => { if(val) setMatForm({...matForm, filiereId: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Filière de rattachement">
                            {matForm.filiereId ? filieresReq?.data?.find(f => f.id.toString() === matForm.filiereId)?.nom : "Filière de rattachement"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{filieresReq?.data?.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={addMat.isPending} className="w-full rounded-xl font-bold h-12 text-md mt-2">Créer la matière</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">Code</TableHead><TableHead>Nom</TableHead><TableHead>Filière</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadMat ? renderSkeletons(4) : matieresReq?.data?.map((mat, i) => (
                    <motion.tr key={mat.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold font-mono text-primary text-xs">{mat.code}</TableCell><TableCell className="font-bold">{mat.nom}</TableCell><TableCell className="text-muted-foreground">{mat.filiere.nom}</TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 outline-none"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { setEditMat({ id: mat.id, code: mat.code, nom: mat.nom, credits: mat.credits.toString(), semestre: mat.semestre, filiereId: mat.filiereId.toString() }); setEditMatOpen(true); }} className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget({ id: mat.id, type: 'mat' })} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
                          </DropdownMenuGroup></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={editMatOpen} onOpenChange={setEditMatOpen}>
            <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-150">
              <DialogHeader><DialogTitle className="text-xl font-black">Modifier la Matière</DialogTitle></DialogHeader>
              {editMat && (
                <form onSubmit={e => { e.preventDefault(); updMat.mutate({ id: editMat.id, payload: { code: editMat.code, nom: editMat.nom, credits: Number(editMat.credits), semestre: editMat.semestre, filiereId: Number(editMat.filiereId) } }); }} className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Code</label>
                      <Input className="rounded-xl bg-background/50 h-12 font-mono text-primary font-bold" required value={editMat.code} onChange={e => setEditMat({...editMat, code: e.target.value})} />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Nom de la matière</label>
                      <Input className="rounded-xl bg-background/50 h-12" required value={editMat.nom} onChange={e => setEditMat({...editMat, nom: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Crédits (1-30)</label>
                      <Input type="number" min="1" max="30" required value={editMat.credits} onChange={e => setEditMat({...editMat, credits: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Semestre</label>
                      <Select value={editMat.semestre} onValueChange={(val: string | null) => { if(val) setEditMat({...editMat, semestre: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Semestre">{editMat.semestre || "Sélectionner"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{SEMESTRES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Filière de rattachement</label>
                    <Select value={editMat.filiereId.toString()} onValueChange={(val: string | null) => { if(val) setEditMat({...editMat, filiereId: val}) }}>
                      <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                        <SelectValue placeholder="Filière">{editMat.filiereId ? filieresReq?.data?.find(f => f.id.toString() === editMat.filiereId.toString())?.nom : "Sélectionner la filière"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-200">{filieresReq?.data?.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={updMat.isPending} className="w-full rounded-xl font-bold h-12 text-md">
                      {updMat.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enregistrer les modifications'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- ONGLET: PROGRAMME (COURS) --- */}
        <TabsContent value="courses" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-4 pt-6">
              <CardTitle>Programme de Cours</CardTitle>
              <Dialog open={openCourse} onOpenChange={setOpenCourse}>
                <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 outline-none"><Plus className="w-4 h-4 mr-2" /> Créer un Bloc</DialogTrigger>
                <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
                  <DialogHeader><DialogTitle>Nouveau Bloc de Cours</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); addCourse.mutate({ matiereId: Number(courseForm.matiereId), classeId: Number(courseForm.classeId), anneeId: Number(courseForm.anneeId) }); }} className="space-y-5 pt-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Année Académique</label>
                      <Select value={courseForm.anneeId} onValueChange={(val: string | null) => { if(val) setCourseForm({...courseForm, anneeId: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Sélectionnez l'année">
                            {courseForm.anneeId ? anneesReq?.data?.find(a => a.id.toString() === courseForm.anneeId)?.libelle : "Sélectionnez l'année"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{anneesReq?.data?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.libelle}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Classe</label>
                      <Select value={courseForm.classeId} onValueChange={(val: string | null) => { if(val) setCourseForm({...courseForm, classeId: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Sélectionnez la classe">
                            {courseForm.classeId ? classesReq?.data?.find(c => c.id.toString() === courseForm.classeId)?.code : "Sélectionnez la classe"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{classesReq?.data?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.code}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Matière</label>
                      <Select value={courseForm.matiereId} onValueChange={(val: string | null) => { if(val) setCourseForm({...courseForm, matiereId: val}) }}>
                        <SelectTrigger className="rounded-xl bg-background/50 h-12 w-full">
                          <SelectValue placeholder="Sélectionnez la matière">
                            {courseForm.matiereId ? matieresReq?.data?.find(m => m.id.toString() === courseForm.matiereId)?.nom : "Sélectionnez la matière"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-200">{matieresReq?.data?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nom} ({m.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" disabled={addCourse.isPending || !courseForm.matiereId || !courseForm.classeId || !courseForm.anneeId} className="w-full rounded-xl font-bold h-12 text-md mt-2">Générer le Cours</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30"><TableRow className="border-border/40"><TableHead className="font-bold px-6 py-4">Matière</TableHead><TableHead>Classe</TableHead><TableHead>Année</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadCourses ? renderSkeletons(4) : coursesReq?.data?.map((course, i) => (
                    <motion.tr key={course.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6 font-bold">{course.matiere.nom}</TableCell>
                      <TableCell><Badge variant="outline">{course.classe.code}</Badge></TableCell>
                      <TableCell className="text-muted-foreground font-semibold">{course.annee.libelle}</TableCell>
                      <TableCell className="text-right px-6">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: course.id, type: 'course' })} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- MODALE GLOBALE DE SUPPRESSION --- */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[90%] sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive font-black text-xl"><AlertTriangle className="mr-2 h-6 w-6" /> Attention</DialogTitle>
            <DialogDescription className="pt-3 text-sm font-medium">Cette action est <span className="font-bold text-foreground">définitive</span>. Êtes-vous sûr de vouloir continuer ?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl font-bold w-full sm:w-auto h-11">Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-xl font-bold w-full sm:w-auto h-11 shadow-lg shadow-destructive/20">Oui, supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}