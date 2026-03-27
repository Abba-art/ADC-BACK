'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { BookOpen, ShieldAlert, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ==========================================
// TYPES STRICTS
// ==========================================
interface UtilisateurMin { nom: string; prenom: string; statut?: { libelle: string } }
interface MatiereMin { nom: string; code: string; credits: number; semestre: string }
interface ClasseMin { code: string }

interface Enseignement {
  id: string;
  estActif: boolean;
  statutValidation: 'PROPOSITION' | 'VALIDE' | 'REJETE';
  utilisateur: UtilisateurMin;
  course: {
    matiere: MatiereMin;
    classe: ClasseMin;
  };
  createdAt: string;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string }

export default function EnseignementsPage() {
  const queryClient = useQueryClient();

  // --- REQUÊTES API ---
  const { data: actifsReq, isLoading: loadActifs, isError: errActifs } = useQuery({ 
    queryKey: ['enseignements-actifs'], 
    queryFn: () => fetchApi<ApiResponse<Enseignement[]>>('/enseignements/actifs') 
  });

  const { data: propsReq, isLoading: loadProps, isError: errProps } = useQuery({ 
    queryKey: ['enseignements-propositions'], 
    queryFn: () => fetchApi<ApiResponse<Enseignement[]>>('/enseignements/propositions') 
  });

  const actifs = actifsReq?.data || [];
  const propositions = propsReq?.data || [];

  // --- MUTATION ---
  const validationMutation = useMutation({
    mutationFn: ({ id, statut }: { id: string, statut: 'VALIDE' | 'REJETE' }) => 
      fetchApi<ApiResponse<unknown>>('/enseignements/valider', { 
        method: 'PATCH', 
        body: JSON.stringify({ enseignementId: id, statut }) 
      }),
    onSuccess: (res: any) => { 
      toast.success(res.message || 'Action effectuée avec succès'); 
      queryClient.invalidateQueries({ queryKey: ['enseignements-propositions'] }); 
      queryClient.invalidateQueries({ queryKey: ['enseignements-actifs'] }); 
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- UI HELPERS ---
  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = () => Array.from({ length: 4 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={4} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" /> Attributions des Enseignements
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Supervisez la charge horaire globale et validez les propositions.</p>
      </motion.div>

      <Tabs defaultValue="propositions" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="propositions" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Propositions en Attente
              {propositions.length > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5">{propositions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="actifs" className="rounded-xl px-4 py-2 font-bold"><Check className="w-4 h-4 mr-2" /> Enseignements Actifs</TabsTrigger>
          </TabsList>
        </div>

        {/* ONGLET: PROPOSITIONS EN ATTENTE */}
        <TabsContent value="propositions" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle className="flex items-center gap-2">Propositions des Chefs de Département</CardTitle>
              <CardDescription>Les cours ci-dessous ont été assignés, mais nécessitent votre validation définitive.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="font-bold px-6 py-4">Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Enseignant Proposé</TableHead>
                    <TableHead className="text-right px-6">Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadProps ? renderSkeletons() : errProps ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 opacity-50" />Erreur API</TableCell></TableRow>
                  ) : propositions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Aucune proposition en attente de validation.</TableCell></TableRow>
                  ) : propositions.map((prop, i) => (
                    <motion.tr key={prop.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6">
                        <div className="font-bold text-foreground">{prop.course.matiere.nom}</div>
                        <div className="text-xs text-primary font-mono font-bold">{prop.course.matiere.code} • {prop.course.matiere.semestre} • {prop.course.matiere.credits} Cr</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-bold">{prop.course.classe.code}</Badge></TableCell>
                      <TableCell className="font-semibold">{prop.utilisateur.nom} {prop.utilisateur.prenom}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white" onClick={() => validationMutation.mutate({ id: prop.id, statut: 'VALIDE' })} disabled={validationMutation.isPending}>
                            <Check className="w-4 h-4 mr-1" /> Valider
                          </Button>
                          <Button size="sm" variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white" onClick={() => validationMutation.mutate({ id: prop.id, statut: 'REJETE' })} disabled={validationMutation.isPending}>
                            <X className="w-4 h-4 mr-1" /> Rejeter
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET: ENSEIGNEMENTS ACTIFS */}
        <TabsContent value="actifs" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle>Attributions en cours</CardTitle>
              <CardDescription>Liste de toutes les attributions de matières qui ont été validées.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="font-bold px-6 py-4">Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Professeur Titulaire</TableHead>
                    <TableHead className="text-center px-6">Crédits (Charge)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadActifs ? renderSkeletons() : errActifs ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 opacity-50" />Erreur API</TableCell></TableRow>
                  ) : actifs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Aucune attribution active.</TableCell></TableRow>
                  ) : actifs.map((actif, i) => (
                    <motion.tr key={actif.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6">
                        <div className="font-bold text-foreground">{actif.course.matiere.nom}</div>
                        <div className="text-xs text-primary font-mono font-bold">{actif.course.matiere.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{actif.course.classe.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{actif.utilisateur.nom} {actif.utilisateur.prenom}</div>
                        {actif.utilisateur.statut && <div className="text-xs opacity-70">{actif.utilisateur.statut.libelle}</div>}
                      </TableCell>
                      <TableCell className="text-center px-6">
                        <Badge variant="secondary" className="font-bold bg-secondary/20">{actif.course.matiere.credits} Cr</Badge>
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