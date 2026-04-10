'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Building, CalendarDays, GraduationCap, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Institut { id: number; nom: string; adresse: string; _count: { departements: number; utilisateurs: number } }
interface Annee { id: number; libelle: string; }
interface Classe { id: number; code: string; departement: { nom: string }; niveau: { libelle: string } }
interface Niveau { id: number; libelle: string; }
interface Departement { id: number; nom: string; }
interface ApiResponse<T> { success: boolean; data: T; }

// Payloads pour les mutations
interface InstitutPayload { nom: string; adresse: string; }
interface AnneePayload { libelle: string; }
interface ClassePayload { code: string; departementId: number; niveauId: number; }

export default function AdminOrganisationPage() {
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);

    // --- CORRECTION ESLINT : Montage asynchrone ---
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    const [isInstModal, setIsInstModal] = useState(false);
    const [instForm, setInstForm] = useState({ nom: '', adresse: '' });

    const [isAnneeModal, setIsAnneeModal] = useState(false);
    const [anneeForm, setAnneeForm] = useState({ libelle: '' });

    const [isClasseModal, setIsClasseModal] = useState(false);
    const [classeForm, setClasseForm] = useState({ code: '', departementId: '', niveauId: '' });

    const { data: institutsReq } = useQuery({ queryKey: ['instituts'], queryFn: () => fetchApi<ApiResponse<Institut[]>>('/instituts') });
    const { data: anneesReq } = useQuery({ queryKey: ['annees'], queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') });
    const { data: classesReq } = useQuery({ queryKey: ['classes'], queryFn: () => fetchApi<ApiResponse<Classe[]>>('/structure/classes') });
    const { data: niveauxReq } = useQuery({ queryKey: ['niveaux'], queryFn: () => fetchApi<ApiResponse<Niveau[]>>('/structure/niveaux') });
    const { data: depsReq } = useQuery({ queryKey: ['departements'], queryFn: () => fetchApi<ApiResponse<Departement[]>>('/structure/departements') });

    // --- MUTATIONS STRICTEMENT TYPÉES ---
    const addInstMutation = useMutation({
        mutationFn: (p: InstitutPayload) => fetchApi('/instituts', { method: 'POST', body: JSON.stringify(p) }),
        onSuccess: () => { toast.success('Institut créé'); setIsInstModal(false); setInstForm({ nom: '', adresse: '' }); queryClient.invalidateQueries({ queryKey: ['instituts'] }); }
    });

    const addAnneeMutation = useMutation({
        mutationFn: (p: AnneePayload) => fetchApi('/structure/annees', { method: 'POST', body: JSON.stringify(p) }),
        onSuccess: () => { toast.success('Année ajoutée'); setIsAnneeModal(false); setAnneeForm({ libelle: '' }); queryClient.invalidateQueries({ queryKey: ['annees'] }); }
    });

    const addClasseMutation = useMutation({
        mutationFn: (p: ClassePayload) => fetchApi('/structure/classes', { method: 'POST', body: JSON.stringify(p) }),
        onSuccess: () => { toast.success('Classe créée'); setIsClasseModal(false); setClasseForm({ code: '', departementId: '', niveauId: '' }); queryClient.invalidateQueries({ queryKey: ['classes'] }); }
    });

    const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

    if (!mounted) return null;

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Organisation Établissement</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Gérez les instituts, les années académiques et les classes.</p>
                </div>
            </motion.div>

            <Tabs defaultValue="instituts" className="w-full">
                <TabsList className="bg-card/80 backdrop-blur-xl border border-border/40 h-14 p-1.5 rounded-2xl mb-6 shadow-sm inline-flex">
                    <TabsTrigger value="instituts" className="rounded-xl px-6 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Building className="w-4 h-4" /> Instituts</TabsTrigger>
                    <TabsTrigger value="classes" className="rounded-xl px-6 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><GraduationCap className="w-4 h-4" /> Classes</TabsTrigger>
                    <TabsTrigger value="annees" className="rounded-xl px-6 font-bold gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-all"><CalendarDays className="w-4 h-4" /> Années Académiques</TabsTrigger>
                </TabsList>

                {/* ONGLET INSTITUTS */}
                <TabsContent value="instituts">
                    <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 bg-muted/10 py-5">
                            <CardTitle className="text-xl font-black">Instituts de l&lsquo;IUG</CardTitle>
                            <Button onClick={() => setIsInstModal(true)} className="h-10 rounded-xl px-4 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" /> Nouvel Institut</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30"><TableRow>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest py-4 px-6">Nom</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest">Adresse</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Départements liés</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {institutsReq?.data?.map((inst, i) => (
                                        <motion.tr key={inst.id} custom={i} variants={rowVariants} initial="hidden" animate="show" className="hover:bg-muted/20">
                                            <TableCell className="px-6 font-black">{inst.nom}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{inst.adresse || 'Non spécifiée'}</TableCell>
                                            <TableCell className="text-center font-bold text-primary">{inst._count?.departements || 0}</TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ONGLET CLASSES */}
                <TabsContent value="classes">
                    <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 bg-muted/10 py-5">
                            <CardTitle className="text-xl font-black">Classes Actives</CardTitle>
                            <Button onClick={() => setIsClasseModal(true)} className="h-10 rounded-xl px-4 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" /> Nouvelle Classe</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30"><TableRow>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest py-4 px-6">Code Classe</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest">Niveau</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest">Département</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {classesReq?.data?.map((c, i) => (
                                        <motion.tr key={c.id} custom={i} variants={rowVariants} initial="hidden" animate="show" className="hover:bg-muted/20">
                                            <TableCell className="px-6 font-mono font-bold text-secondary">{c.code}</TableCell>
                                            <TableCell className="font-bold text-sm">{c.niveau.libelle}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{c.departement.nom}</TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ONGLET ANNÉES */}
                <TabsContent value="annees">
                    <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 bg-muted/10 py-5">
                            <CardTitle className="text-xl font-black">Années Académiques</CardTitle>
                            <Button onClick={() => setIsAnneeModal(true)} className="h-10 rounded-xl px-4 font-bold bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20"><Plus className="h-4 w-4 mr-2" /> Nouvelle Année</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30"><TableRow>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest py-4 px-6">Libellé</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {anneesReq?.data?.map((a, i) => (
                                        <motion.tr key={a.id} custom={i} variants={rowVariants} initial="hidden" animate="show" className="hover:bg-muted/20">
                                            <TableCell className="px-6 font-black text-lg">{a.libelle}</TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* --- MODALES --- */}
            <Dialog open={isInstModal} onOpenChange={setIsInstModal}>
                <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl"><DialogHeader><DialogTitle>Nouvel Institut</DialogTitle></DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); addInstMutation.mutate(instForm); }} className="space-y-4">
                        <Input placeholder="Nom de l'institut (ex: ISTA)" value={instForm.nom} onChange={e => setInstForm({ ...instForm, nom: e.target.value.toUpperCase() })} required className="rounded-xl h-11 bg-background/50" />
                        <Input placeholder="Adresse (ex: Campus Principal)" value={instForm.adresse} onChange={e => setInstForm({ ...instForm, adresse: e.target.value })} className="rounded-xl h-11 bg-background/50" />
                        <Button type="submit" className="w-full rounded-xl font-bold h-11 shadow-lg shadow-primary/20" disabled={addInstMutation.isPending}>
                            {addInstMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Ajouter"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAnneeModal} onOpenChange={setIsAnneeModal}>
                <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl"><DialogHeader><DialogTitle>Nouvelle Année Académique</DialogTitle></DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); addAnneeMutation.mutate(anneeForm); }} className="space-y-4">
                        <Input placeholder="Ex: 2026-2027" value={anneeForm.libelle} onChange={e => setAnneeForm({ libelle: e.target.value })} required className="rounded-xl h-11 bg-background/50" />
                        <Button type="submit" className="w-full rounded-xl font-bold h-11 shadow-lg shadow-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={addAnneeMutation.isPending}>
                            {addAnneeMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Ajouter"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isClasseModal} onOpenChange={setIsClasseModal}>
                <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl"><DialogHeader><DialogTitle>Nouvelle Classe</DialogTitle></DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); addClasseMutation.mutate({ code: classeForm.code, departementId: Number(classeForm.departementId), niveauId: Number(classeForm.niveauId) }); }} className="space-y-4">
                        <Input placeholder="Code de la classe (ex: GL1AJ)" value={classeForm.code} onChange={e => setClasseForm({ ...classeForm, code: e.target.value.toUpperCase() })} required className="rounded-xl h-11 bg-background/50" />
                        {/* 🔥 CORRECTION TYPESCRIPT : (v: string) */}
                        {/* 🔥 CORRECTION TYPESCRIPT : On accepte le type par défaut et on vérifie s'il existe (v) */}
                        <Select onValueChange={(v: string | null) => { if (v) setClasseForm({ ...classeForm, departementId: v }) }}>
                            <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Département..." /></SelectTrigger>
                            <SelectContent className="rounded-xl z-[200]">{depsReq?.data?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.nom}</SelectItem>)}</SelectContent>
                        </Select>

                        {/* 🔥 CORRECTION TYPESCRIPT */}
                        <Select onValueChange={(v: string | null) => { if (v) setClasseForm({ ...classeForm, niveauId: v }) }}>
                            <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Niveau..." /></SelectTrigger>
                            <SelectContent className="rounded-xl z-[200]">{niveauxReq?.data?.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.libelle}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="submit" className="w-full rounded-xl font-bold h-11 shadow-lg shadow-primary/20" disabled={addClasseMutation.isPending}>
                            {addClasseMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Créer la classe"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}