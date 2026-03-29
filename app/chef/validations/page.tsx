'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { ClipboardCheck, ShieldAlert, Check, X, Clock, AlertTriangle } from 'lucide-react';
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

export default function ValidationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Sécurité Frontend : Seul le Chef d'Établissement valide
  const userRole = user ? (typeof user.role === 'object' ? user.role.libelle : user.role) : '';
  const isChefEtablissement = userRole === 'CHEF_ETABLISSEMENT';

  // --- REQUÊTES API ---
  const { data: propsReq, isLoading: loadProps, isError: errProps } = useQuery({ 
    queryKey: ['enseignements-propositions'], 
    queryFn: () => fetchApi<ApiResponse<Enseignement[]>>('/enseignements/propositions'),
    enabled: isChefEtablissement // On ne lance la requête que s'il a les droits
  });

  const { data: actifsReq, isLoading: loadActifs } = useQuery({ 
    queryKey: ['enseignements-actifs'], 
    queryFn: () => fetchApi<ApiResponse<Enseignement[]>>('/enseignements/actifs'),
    enabled: isChefEtablissement
  });

  const propositions = propsReq?.data || [];
  const actifs = actifsReq?.data || [];

  // --- MUTATION DE VALIDATION ---
  // 🔥 CORRECTION DU TYPE `any` EN `ApiResponse<unknown>` 🔥
  const validationMutation = useMutation({
    mutationFn: ({ id, statut }: { id: string, statut: 'VALIDE' | 'REJETE' }) => 
      fetchApi<ApiResponse<unknown>>('/enseignements/valider', { 
        method: 'PATCH', 
        body: JSON.stringify({ enseignementId: id, statut }) 
      }),
    onSuccess: (res: ApiResponse<unknown>) => { 
      toast.success(res.message || 'Action enregistrée avec succès'); 
      queryClient.invalidateQueries({ queryKey: ['enseignements-propositions'] }); 
      queryClient.invalidateQueries({ queryKey: ['enseignements-actifs'] }); 
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- UI HELPERS ---
  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = () => Array.from({ length: 4 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={4} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  // Si c'est un Chef de Département, on lui bloque l'accès visuellement
  if (!isChefEtablissement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-24 w-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Accès Restreint</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Cette page est réservée à la Direction d&apos;Établissement. En tant que Chef de Département, vos propositions doivent être validées par votre hiérarchie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" /> Approbations
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Validez ou rejetez les affectations proposées par vos Chefs de Département.</p>
      </motion.div>

      <Tabs defaultValue="attente" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="attente" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <Clock className="w-4 h-4 mr-2" /> À Valider
              {propositions.length > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">{propositions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="valides" className="rounded-xl px-4 py-2 font-bold"><Check className="w-4 h-4 mr-2" /> Historique Validé</TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================= */}
        {/* ONGLET: PROPOSITIONS EN ATTENTE */}
        {/* ========================================================= */}
        <TabsContent value="attente" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            {/* 🔥 CORRECTION CLASSE CSS TAILWIND bg-linear-to-r -> bg-gradient-to-r 🔥 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-500 via-yellow-500 to-orange-500 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle className="flex items-center gap-2">Affectations en attente</CardTitle>
              <CardDescription>Ces propositions ont été faites par les Chefs de Département de vos instituts.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="font-bold px-6 py-4">Cours</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Professeur Proposé</TableHead>
                    <TableHead className="text-right px-6">Décision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadProps ? renderSkeletons() : errProps ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 opacity-50" />Erreur API</TableCell></TableRow>
                  ) : propositions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium text-lg">Aucune proposition en attente.</TableCell></TableRow>
                  ) : propositions.map((prop, i) => (
                    <motion.tr key={prop.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                      <TableCell className="px-6">
                        <div className="font-bold text-foreground">{prop.course.matiere.nom}</div>
                        <div className="text-xs text-primary font-mono font-bold">{prop.course.matiere.code} • {prop.course.matiere.credits} Cr</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-bold">{prop.course.classe.code}</Badge></TableCell>
                      <TableCell className="font-semibold">{prop.utilisateur.nom} {prop.utilisateur.prenom}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white transition-colors"
                            onClick={() => validationMutation.mutate({ id: prop.id, statut: 'VALIDE' })}
                            disabled={validationMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" /> Valider
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-colors"
                            onClick={() => validationMutation.mutate({ id: prop.id, statut: 'REJETE' })}
                            disabled={validationMutation.isPending}
                          >
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

        {/* ========================================================= */}
        {/* ONGLET: ENSEIGNEMENTS VALIDÉS */}
        {/* ========================================================= */}
        <TabsContent value="valides" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle>Affectations Actives</CardTitle>
              <CardDescription>Liste des enseignements actuellement validés et en cours.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="font-bold px-6 py-4">Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Professeur Titulaire</TableHead>
                    <TableHead className="text-center px-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {loadActifs ? renderSkeletons() : actifs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Aucun enseignement actif.</TableCell></TableRow>
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
                      </TableCell>
                      <TableCell className="text-center px-6">
                        <Badge variant="secondary" className="font-bold bg-green-500/10 text-green-500 border-green-500/20">Validé</Badge>
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