'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { BookOpen, UserPlus, ShieldAlert, Loader2, Clock, Plus, RefreshCw, MessageSquareQuote, CalendarDays, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Annee { id: number; libelle: string; }
interface CourseNonAssigne { id: string; matiere: { nom: string; code: string; credits: number; semestre: string }; classe: { code: string }; annee: { libelle: string }; }
interface EnseignementActif { id: string; courseId: string; course: { matiere: { nom: string; code: string; credits: number; semestre: string }; classe: { code: string }; annee: { libelle: string } }; utilisateur: { nom: string; prenom: string }; }
interface Utilisateur { id: string; nom: string; prenom: string; role?: { libelle: string }; statut?: { libelle: string; quotaHeureMax: number; quotaPeriode: string } }
interface EnseignementProposition { id: string; statutValidation: string; course: { matiere: { nom: string; code: string }; classe: { code: string } }; utilisateur: { nom: string; prenom: string } }
interface ApiResponse<T> { success: boolean; data: T; message?: string }

export default function AttributionsPage() {
  const queryClient = useQueryClient();

  // --- ÉTATS FORMULAIRE NOUVELLE AFFECTATION ---
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedProf, setSelectedProf] = useState<string>('');

  // --- ÉTATS FORMULAIRE RÉAFFECTATION ---
  const [selectedActiveCourseId, setSelectedActiveCourseId] = useState<string>('');
  const [selectedNewProf, setSelectedNewProf] = useState<string>('');
  const [motif, setMotif] = useState<string>('');

  // --- ÉTATS FORMULAIRE RECONDUCTION ---
  const [anneeSource, setAnneeSource] = useState<string>('');
  const [anneeCible, setAnneeCible] = useState<string>('');

  // --- REQUÊTES API ---
  const { data: anneesReq, isLoading: loadAnnees } = useQuery({ queryKey: ['annees'], queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') });
  const { data: coursesReq, isLoading: loadCourses } = useQuery({ queryKey: ['courses-non-assignes'], queryFn: () => fetchApi<ApiResponse<CourseNonAssigne[]>>('/structure/courses?nonAssigne=true') });
  const { data: usersReq, isLoading: loadUsers } = useQuery({ queryKey: ['professeurs-actifs'], queryFn: () => fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs/professeurs') });
  const { data: propsReq, isLoading: loadProps } = useQuery({ queryKey: ['enseignements-propositions'], queryFn: () => fetchApi<ApiResponse<EnseignementProposition[]>>('/enseignements/propositions') });
  const { data: actifsReq, isLoading: loadActifs } = useQuery({ queryKey: ['enseignements-actifs'], queryFn: () => fetchApi<ApiResponse<EnseignementActif[]>>('/enseignements/actifs') });

  const annees = anneesReq?.data || [];
  const courses = coursesReq?.data || [];
  const propositions = propsReq?.data || [];
  const enseignementsActifs = actifsReq?.data || [];
  const professeurs = (usersReq?.data || []).filter(u => !u.role || u.role?.libelle === 'PROFESSEUR');

  // --- MUTATIONS ---
  const attributionMutation = useMutation({
    mutationFn: (data: { courseId: string, utilisateurId: string, motif?: string }) => fetchApi<ApiResponse<unknown>>('/enseignements/assigner', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Opération réussie ! En attente de validation.');
      setSelectedCourse(''); setSelectedProf(''); setSelectedActiveCourseId(''); setSelectedNewProf(''); setMotif('');
      queryClient.invalidateQueries({ queryKey: ['courses-non-assignes'] });
      queryClient.invalidateQueries({ queryKey: ['enseignements-propositions'] });
      queryClient.invalidateQueries({ queryKey: ['enseignements-actifs'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const reconductionMutation = useMutation({
    mutationFn: (data: { anneeSourceId: number, anneeCibleId: number }) => fetchApi<ApiResponse<unknown>>('/enseignements/reconduire', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Reconduction terminée avec succès !');
      setAnneeSource(''); setAnneeCible('');
      queryClient.invalidateQueries({ queryKey: ['courses-non-assignes'] });
      queryClient.invalidateQueries({ queryKey: ['enseignements-propositions'] });
      queryClient.invalidateQueries({ queryKey: ['enseignements-actifs'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- GESTIONNAIRES D'ÉVÉNEMENTS ---
  const handleNouvelleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourse || !selectedProf) return toast.error('Veuillez sélectionner un cours et un professeur.');
    attributionMutation.mutate({ courseId: selectedCourse, utilisateurId: selectedProf });
  };

  const handleReaffectationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedActiveCourseId || !selectedNewProf) return toast.error('Veuillez sélectionner le cours actif et le nouveau professeur.');
    attributionMutation.mutate({ courseId: selectedActiveCourseId, utilisateurId: selectedNewProf, motif: motif || 'Réassignation standard' });
  };

  const handleReconductionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!anneeSource || !anneeCible) return toast.error('Veuillez sélectionner les deux années.');
    if (anneeSource === anneeCible) return toast.error('Les deux années doivent être différentes.');
    reconductionMutation.mutate({ anneeSourceId: Number(anneeSource), anneeCibleId: Number(anneeCible) });
  };

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = () => Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={4} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" /> Gestion des Affectations
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Assignez, réattribuez ou reconduisez les cours de l&apos;année précédente.</p>
      </motion.div>

      <Tabs defaultValue="nouvelle" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="nouvelle" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Affectation
            </TabsTrigger>
            <TabsTrigger value="reaffectation" className="rounded-xl px-4 py-2 font-bold flex items-center text-orange-500 data-[state=active]:text-orange-600">
              <RefreshCw className="w-4 h-4 mr-2" /> Réaffectation
            </TabsTrigger>
            <TabsTrigger value="reconduction" className="rounded-xl px-4 py-2 font-bold flex items-center text-blue-500 data-[state=active]:text-blue-600">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Reconduction
            </TabsTrigger>
            <TabsTrigger value="historique" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Mes Propositions
              {propositions.length > 0 && <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">{propositions.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ==================================================== */}
        {/* ONGLET 1 : NOUVELLE AFFECTATION                      */}
        {/* ==================================================== */}
        <TabsContent value="nouvelle" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40 sm:max-w-3xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6 text-center">
              <CardTitle className="text-2xl font-black">Créer une Proposition</CardTitle>
              <CardDescription className="text-base mt-1">Sélectionnez un bloc de cours sans professeur.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <form onSubmit={handleNouvelleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> 1. Cours à assigner
                  </label>
                  {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                  <Select value={selectedCourse} onValueChange={(val) => setSelectedCourse(val || '')}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-lg border-primary/20 focus:ring-primary/30 w-full">
                      <SelectValue placeholder={loadCourses ? "Recherche..." : "Choisir un cours sans professeur"}>
                        {selectedCourse && courses.find(c => c.id === selectedCourse) ? (
                          <span>{courses.find(c => c.id === selectedCourse)?.matiere.nom} ({courses.find(c => c.id === selectedCourse)?.classe.code})</span>
                        ) : "Choisir un cours sans professeur"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-200">
                      {courses.length === 0 && !loadCourses ? (
                        <SelectItem value="none" disabled>Aucun cours disponible</SelectItem>
                      ) : (
                        courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-bold">{c.matiere.nom}</span>
                            <span className="text-muted-foreground text-xs ml-2 uppercase">
                              ({c.classe.code} • {c.matiere.semestre} • {c.matiere.credits} Cr)
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`space-y-3 transition-opacity duration-300 ${!selectedCourse ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> 2. Professeur
                  </label>
                  {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                  <Select value={selectedProf} onValueChange={(val) => setSelectedProf(val || '')} disabled={!selectedCourse}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-lg border-primary/20 focus:ring-primary/30 w-full">
                      <SelectValue placeholder={loadUsers ? "Chargement..." : "Choisir le professeur titulaire"}>
                        {selectedProf && professeurs.find(p => p.id === selectedProf) ? (
                           <span>{professeurs.find(p => p.id === selectedProf)?.nom} {professeurs.find(p => p.id === selectedProf)?.prenom}</span>
                        ) : "Choisir le professeur titulaire"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-200">
                      {professeurs.length === 0 && !loadUsers ? (
                         <SelectItem value="none" disabled>Aucun professeur trouvé</SelectItem>
                      ) : (
                        professeurs.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-bold">{p.nom} {p.prenom}</span>
                            {p.statut && <span className="text-muted-foreground text-xs ml-2 uppercase">[{p.statut.libelle}]</span>}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-border/40">
                  <Button type="submit" disabled={!selectedCourse || !selectedProf || attributionMutation.isPending} className="w-full rounded-xl font-black h-14 text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {attributionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Proposer cette Affectation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* ONGLET 2 : RÉAFFECTATION                             */}
        {/* ==================================================== */}
        <TabsContent value="reaffectation" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40 sm:max-w-3xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-400 to-orange-600 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6 text-center">
              <CardTitle className="text-2xl font-black text-orange-600">Réattribuer un Cours</CardTitle>
              <CardDescription className="text-base mt-1">Retirez un cours à un professeur pour le donner à un autre.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <form onSubmit={handleReaffectationSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-orange-500" /> 1. Cours Actif à réassigner
                  </label>
                  {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                  <Select value={selectedActiveCourseId} onValueChange={(val) => setSelectedActiveCourseId(val || '')}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-base border-orange-500/20 focus:ring-orange-500/30 w-full">
                      <SelectValue placeholder={loadActifs ? "Recherche..." : "Choisir un cours déjà attribué"}>
                        {selectedActiveCourseId && enseignementsActifs.find(e => e.courseId === selectedActiveCourseId) ? (
                          <span>{enseignementsActifs.find(e => e.courseId === selectedActiveCourseId)?.course.matiere.nom} ({enseignementsActifs.find(e => e.courseId === selectedActiveCourseId)?.course.classe?.code || ''})</span>
                        ) : "Choisir un cours déjà attribué"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-200">
                      {enseignementsActifs.length === 0 && !loadActifs ? (
                        <SelectItem value="none" disabled>Aucun cours actif trouvé</SelectItem>
                      ) : (
                        enseignementsActifs.map(ens => (
                          <SelectItem key={ens.courseId} value={ens.courseId}>
                            <span className="font-bold">{ens.course.matiere.nom}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              (Prof actuel: <span className="font-bold text-destructive">{ens.utilisateur.nom}</span>)
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`space-y-3 transition-opacity duration-300 ${!selectedActiveCourseId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-orange-500" /> 2. Nouveau Professeur
                  </label>
                  {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                  <Select value={selectedNewProf} onValueChange={(val) => setSelectedNewProf(val || '')} disabled={!selectedActiveCourseId}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-base border-orange-500/20 focus:ring-orange-500/30 w-full">
                      <SelectValue placeholder="Choisir le remplaçant" />
                    </SelectTrigger>
                    <SelectContent className="z-200">
                      {professeurs.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-bold">{p.nom} {p.prenom}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`space-y-3 transition-opacity duration-300 ${!selectedActiveCourseId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4 text-orange-500" /> 3. Motif du changement (Optionnel)
                  </label>
                  <Input placeholder="Ex: Maladie, Indisponibilité..." value={motif} onChange={e => setMotif(e.target.value)} className="rounded-xl bg-background/50 h-12" />
                </div>

                <div className="pt-4 border-t border-border/40">
                  <Button type="submit" variant="default" disabled={!selectedActiveCourseId || !selectedNewProf || attributionMutation.isPending} className="w-full rounded-xl font-black h-14 text-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {attributionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Proposer la Réaffectation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* ONGLET 3 : RECONDUCTION AUTOMATIQUE                  */}
        {/* ==================================================== */}
        <TabsContent value="reconduction" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40 sm:max-w-3xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-400 to-blue-600 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6 text-center">
              <CardTitle className="text-2xl font-black text-blue-600">Reconduction Annuelle</CardTitle>
              <CardDescription className="text-base mt-1">Copiez automatiquement toutes les affectations validées de l&apos;année précédente vers la nouvelle année scolaire.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <form onSubmit={handleReconductionSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ANNÉE SOURCE */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-500" /> Année d&apos;origine
                    </label>
                    {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                    <Select value={anneeSource} onValueChange={(val) => setAnneeSource(val || '')}>
                      <SelectTrigger className="rounded-xl bg-background/50 h-14 text-base border-blue-500/20 focus:ring-blue-500/30 w-full">
                        <SelectValue placeholder={loadAnnees ? "Chargement..." : "Ex: 2024-2025"} />
                      </SelectTrigger>
                      <SelectContent className="z-200">
                        {annees.map(a => (
                          <SelectItem key={a.id} value={a.id.toString()} className="font-bold">{a.libelle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ANNÉE CIBLE */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-500" /> Nouvelle année
                    </label>
                    {/* 🔥 FIX : Fonction anonyme directe 🔥 */}
                    <Select value={anneeCible} onValueChange={(val) => setAnneeCible(val || '')}>
                      <SelectTrigger className="rounded-xl bg-background/50 h-14 text-base border-blue-500/20 focus:ring-blue-500/30 w-full">
                        <SelectValue placeholder={loadAnnees ? "Chargement..." : "Ex: 2025-2026"} />
                      </SelectTrigger>
                      <SelectContent className="z-200">
                        {annees.map(a => (
                          <SelectItem key={a.id} value={a.id.toString()} className="font-bold">{a.libelle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-sm text-blue-700 font-medium flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Cette action recherchera tous les cours équivalents (même matière, même classe) créés dans la nouvelle année et y assignera les mêmes professeurs. Vous pourrez toujours faire des modifications individuelles dans l&apos;onglet &quot;Réaffectation&quot; par la suite.</p>
                </div>

                <div className="pt-4 border-t border-border/40">
                  <Button type="submit" disabled={!anneeSource || !anneeCible || reconductionMutation.isPending} className="w-full rounded-xl font-black h-14 text-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {reconductionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Lancer la Reconduction'}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* ONGLET 4 : HISTORIQUE DES PROPOSITIONS               */}
        {/* ==================================================== */}
        <TabsContent value="historique" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle>Suivi de vos Propositions</CardTitle>
              <CardDescription>Consultez l&apos;état de validation des cours que vous avez affectés ou réaffectés.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="font-bold px-6 py-4">Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Professeur Assigné</TableHead>
                    <TableHead className="text-right px-6">État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadProps ? renderSkeletons() : propositions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Vous n&apos;avez aucune proposition en attente.</TableCell></TableRow>
                  ) : propositions.map((prop, i) => (
                    <motion.tr key={prop.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6">
                        <div className="font-bold text-foreground">{prop.course.matiere.nom}</div>
                        <div className="text-xs text-muted-foreground font-mono">{prop.course.matiere.code}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-bold">{prop.course.classe.code}</Badge></TableCell>
                      <TableCell className="font-semibold">{prop.utilisateur.nom} {prop.utilisateur.prenom}</TableCell>
                      <TableCell className="text-right px-6">
                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                          En attente
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}