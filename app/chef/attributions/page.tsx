'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { BookOpen, UserPlus, ShieldAlert, Loader2, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS BASÉS SUR TON BACKEND
// ==========================================
interface CourseNonAssigne {
  id: string;
  matiere: { nom: string; code: string; credits: number; semestre: string };
  classe: { code: string };
  annee: { libelle: string };
}

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  role?: { libelle: string }; // ? ajouté pour éviter le crash
  statut?: { libelle: string; quotaHeureMax: number; quotaPeriode: string } // ? ajouté au cas où
}

interface EnseignementProposition {
  id: string;
  statutValidation: string;
  course: { matiere: { nom: string; code: string }; classe: { code: string } };
  utilisateur: { nom: string; prenom: string }
}

interface ApiResponse<T> { success: boolean; data: T; message?: string }

export default function AttributionsPage() {
  const queryClient = useQueryClient();

  // --- ÉTATS DU FORMULAIRE ---
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedProf, setSelectedProf] = useState<string>('');

  // --- REQUÊTES API ---
  const { data: coursesReq, isLoading: loadCourses } = useQuery({
    queryKey: ['courses-non-assignes'],
    queryFn: () => fetchApi<ApiResponse<CourseNonAssigne[]>>('/structure/courses?nonAssigne=true')
  });

  const { data: usersReq, isLoading: loadUsers } = useQuery({
    queryKey: ['professeurs-actifs'], 
    queryFn: () => fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs/professeurs')
  });

  const { data: propsReq, isLoading: loadProps } = useQuery({
    queryKey: ['enseignements-propositions'],
    queryFn: () => fetchApi<ApiResponse<EnseignementProposition[]>>('/enseignements/propositions')
  });

  const courses = coursesReq?.data || [];
  const propositions = propsReq?.data || [];
  
  // 🔥 FIX CRASH: Ajout du point d'interrogation `u.role?.libelle` 
  // Et on inclut un fallback au cas où le backend renvoie directement des profs
  const professeurs = (usersReq?.data || []).filter(u => !u.role || u.role?.libelle === 'PROFESSEUR');

  // --- MUTATION ---
  const attributionMutation = useMutation({
    mutationFn: () => fetchApi<ApiResponse<unknown>>('/enseignements/assigner', {
      method: 'POST',
      body: JSON.stringify({
        courseId: selectedCourse,
        utilisateurId: selectedProf
      })
    }),
    onSuccess: (res) => {
      toast.success(res.message || 'Attribution proposée avec succès !');
      setSelectedCourse('');
      setSelectedProf('');
      queryClient.invalidateQueries({ queryKey: ['courses-non-assignes'] });
      queryClient.invalidateQueries({ queryKey: ['enseignements-propositions'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedProf) {
      toast.error('Veuillez sélectionner un cours et un professeur.');
      return;
    }
    attributionMutation.mutate();
  };

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = () => Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={4} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" /> Affectation des Cours
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Assignez les cours de vos instituts aux professeurs. Vos affectations seront soumises à validation.</p>
      </motion.div>

      <Tabs defaultValue="nouvelle" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="nouvelle" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Affectation
            </TabsTrigger>
            <TabsTrigger value="historique" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Mes Propositions
              {propositions.length > 0 && <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5">{propositions.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nouvelle" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40 sm:max-w-3xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6 text-center">
              <CardTitle className="text-2xl font-black">Créer une Proposition</CardTitle>
              <CardDescription className="text-base mt-1">Sélectionnez un bloc de cours disponible, puis le professeur.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. SÉLECTION DU COURS */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> 1. Sélectionner le Cours à assigner
                  </label>
                  <Select value={selectedCourse} onValueChange={(val: string | null) => { if (val) setSelectedCourse(val); }}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-lg border-primary/20 focus:ring-primary/30 w-full">
                      {/* 🔥 FIX: Affichage du nom du cours sélectionné au lieu de l'ID */}
                      <SelectValue placeholder={loadCourses ? "Recherche des cours disponibles..." : "Choisir un cours sans professeur"}>
                        {selectedCourse && courses.find(c => c.id === selectedCourse) ? (
                          <span>{courses.find(c => c.id === selectedCourse)?.matiere.nom} ({courses.find(c => c.id === selectedCourse)?.classe.code})</span>
                        ) : "Choisir un cours sans professeur"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {courses.length === 0 && !loadCourses ? (
                        <SelectItem value="none" disabled>Aucun cours disponible pour vos instituts</SelectItem>
                      ) : (
                        courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-bold">{c.matiere.nom}</span>
                            <span className="text-muted-foreground text-xs ml-2 uppercase">
                              ({c.classe.code} • {c.matiere.semestre} • {c.matiere.credits} Cr) - {c.annee.libelle}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. SÉLECTION DU PROFESSEUR */}
                <div className={`space-y-3 transition-opacity duration-300 ${!selectedCourse ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> 2. Assigner un Professeur
                  </label>
                  <Select value={selectedProf} onValueChange={(val: string | null) => { if (val) setSelectedProf(val); }} disabled={!selectedCourse}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-14 text-lg border-primary/20 focus:ring-primary/30 w-full">
                      {/* 🔥 FIX: Affichage du nom du prof sélectionné au lieu de l'ID */}
                      <SelectValue placeholder={loadUsers ? "Chargement des profs..." : "Choisir le professeur titulaire"}>
                        {selectedProf && professeurs.find(p => p.id === selectedProf) ? (
                           <span>{professeurs.find(p => p.id === selectedProf)?.nom} {professeurs.find(p => p.id === selectedProf)?.prenom}</span>
                        ) : "Choisir le professeur titulaire"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
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
                  <Button
                    type="submit"
                    disabled={!selectedCourse || !selectedProf || attributionMutation.isPending}
                    className="w-full rounded-xl font-black h-14 text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {attributionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Proposer cette Affectation'}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle>Suivi de vos Propositions</CardTitle>
              <CardDescription>Consultez l'état de validation des cours que vous avez affectés.</CardDescription>
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
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Vous n'avez aucune proposition en attente.</TableCell></TableRow>
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