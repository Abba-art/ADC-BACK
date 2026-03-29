'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Search, MoreHorizontal, Trash2, ShieldAlert, CheckCircle, ArchiveX, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  deletedAt?: string | null;
  role?: { libelle: string };
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  // 🔥 AJOUT : La structure des enseignements renvoyée par le nouveau backend
  enseignements?: { course: { matiere: { credits: number } } }[]; 
}

interface ApiResponse<T> { success: boolean; data: T; message?: string }

export default function MesProfesseursPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser } = useAuthStore();
  const currentRole = currentUser ? (typeof currentUser.role === 'object' ? currentUser.role.libelle : currentUser.role) : '';

  // --- REQUÊTES API ---
  const { data: usersReq, isLoading, isError } = useQuery({
    queryKey: ['professeurs-actifs'],
    queryFn: () => fetchApi<ApiResponse<Professeur[]>>('/utilisateurs/professeurs')
  });

  const professeurs = usersReq?.data || [];

  // Filtrage par recherche
  const searchedProfs = professeurs.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- SÉPARATION ACTIFS / INACTIFS ---
  const profsActifs = searchedProfs.filter(p => !p.deletedAt);
  const profsInactifs = searchedProfs.filter(p => !!p.deletedAt);

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      toast.success(res.message || 'Professeur désactivé avec succès');
      queryClient.invalidateQueries({ queryKey: ['professeurs-actifs'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}/restore`, { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(res.message || 'Professeur réactivé avec succès');
      queryClient.invalidateQueries({ queryKey: ['professeurs-actifs'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  // --- FONCTION DE RENDU DU TABLEAU ---
  const renderTable = (data: Professeur[], isActiveTab: boolean) => (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow className="border-border/40">
          <TableHead className="font-bold px-6 py-4">Utilisateur</TableHead>
          <TableHead>Rôle & Statut</TableHead>
          {isActiveTab && <TableHead className="w-[30%]">Jauge de Charge Horaire</TableHead>}
          <TableHead className="text-center">État</TableHead>
          <TableHead className="text-right px-6">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border/40">
        {isLoading ? (
           Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="py-4"><Skeleton className="h-10 w-full bg-muted/60" /></TableCell></TableRow>)
        ) : isError ? (
          <TableRow><TableCell colSpan={5} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 opacity-50" />Erreur de chargement</TableCell></TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground font-medium">
              {isActiveTab ? "Aucun professeur actif trouvé." : "La corbeille est vide."}
            </TableCell>
          </TableRow>
        ) : (
          data.map((prof, i) => {
            // 🔥 CALCUL DE LA CHARGE HORAIRE DYNAMIQUE (Crédits x 15H) 🔥
            const charge = prof.enseignements?.reduce((total, ens) => total + (ens.course.matiere.credits * 15), 0) || 0;
            const max = prof.statut?.quotaHeureMax || 1;
            const pourcentage = Math.min(100, Math.round((charge / max) * 100));
            
            let progressColor = "bg-green-500";
            if (pourcentage > 75) progressColor = "bg-orange-500";
            if (pourcentage >= 100) progressColor = "bg-destructive";

            // SÉCURITÉ FRONTEND: Un Chef ne peut toucher qu'aux "PROFESSEURS"
            const isAdmin = currentRole === 'ADMIN';
            const isTargetProf = prof.role?.libelle === 'PROFESSEUR';
            const canManage = isAdmin || isTargetProf;

            return (
              <motion.tr key={prof.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className={`hover:bg-muted/20 border-border/40 ${!isActiveTab ? 'opacity-60 grayscale' : ''}`}>
                <TableCell className="px-6">
                  <div className="font-bold text-foreground">{prof.nom} {prof.prenom}</div>
                  <div className="text-xs text-muted-foreground">{prof.email}</div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant="secondary" className="text-[10px]">{prof.role?.libelle || 'INCONNU'}</Badge>
                    <Badge variant="outline" className="font-bold bg-background">{prof.statut?.libelle || 'Inconnu'}</Badge>
                  </div>
                </TableCell>
                
                {isActiveTab && (
                  <TableCell>
                    <div className="space-y-1.5 pr-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground">{charge} Heures</span>
                        <span className="text-muted-foreground">Max: {max}H</span>
                      </div>
                      <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${pourcentage}%` }} />
                      </div>
                    </div>
                  </TableCell>
                )}
                
                <TableCell className="text-center">
                  {isActiveTab ? (
                    pourcentage >= 100 ? <Badge variant="destructive" className="shadow-sm">Surchargé</Badge> : 
                    pourcentage > 75 ? <Badge className="bg-orange-500 text-white shadow-sm">Presque plein</Badge> : 
                    <Badge className="bg-green-500 text-white shadow-sm">Disponible</Badge>
                  ) : (
                    <Badge variant="destructive" className="shadow-sm flex items-center justify-center gap-1 mx-auto w-max">
                      <ArchiveX className="w-3 h-3" /> Désactivé
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell className="text-right px-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl z-100 p-1.5">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider px-2">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {isActiveTab ? (
                          canManage ? (
                            <DropdownMenuItem onClick={() => { if(confirm(`Désactiver ${prof.nom} ? Il sera déplacé vers la corbeille.`)) deleteMutation.mutate(prof.id); }} disabled={deleteMutation.isPending} className="cursor-pointer gap-2 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg">
                              <Trash2 className="h-4 w-4" /> Désactiver le compte
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="gap-2 text-xs">
                              <ShieldAlert className="h-4 w-4" /> Action non autorisée
                            </DropdownMenuItem>
                          )
                        ) : (
                          canManage ? (
                            <DropdownMenuItem onClick={() => { if(confirm(`Restaurer le compte de ${prof.nom} ?`)) restoreMutation.mutate(prof.id); }} disabled={restoreMutation.isPending} className="cursor-pointer gap-2 font-bold text-green-600 focus:bg-green-500/10 focus:text-green-600 rounded-lg">
                              <RefreshCw className="h-4 w-4" /> Restaurer le compte
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="gap-2 text-xs">
                              <ShieldAlert className="h-4 w-4" /> Action non autorisée
                            </DropdownMenuItem>
                          )
                        )}
                        
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Mes Professeurs
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gérez la charge horaire de vos enseignants et consultez l&lsquo;historique.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher (Nom, Email)..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-9 bg-card/60 backdrop-blur-xl border-border/40 rounded-xl"
          />
        </div>
      </motion.div>

      <Tabs defaultValue="actifs" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-card/60 backdrop-blur-2xl border border-border/40 h-14 p-1.5 rounded-2xl shadow-sm w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="actifs" className="rounded-xl px-4 py-2 font-bold flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" /> Professeurs Actifs
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">{profsActifs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inactifs" className="rounded-xl px-4 py-2 font-bold flex items-center text-muted-foreground data-[state=active]:text-destructive">
              <ArchiveX className="w-4 h-4 mr-2" /> Corbeille
              {profsInactifs.length > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">{profsInactifs.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="actifs" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-500 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle>Disponibilité et Charge Horaire</CardTitle>
              <CardDescription>Vérifiez que les professeurs ne dépassent pas leur quota avant de leur assigner des cours.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(profsActifs, true)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactifs" className="outline-none">
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-destructive/80 to-red-600/80 opacity-80" />
            <CardHeader className="border-b border-border/40 pb-4 pt-6">
              <CardTitle className="text-destructive">Comptes Inactifs</CardTitle>
              <CardDescription>Historique des enseignants ayant été retirés du système.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(profsInactifs, false)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}