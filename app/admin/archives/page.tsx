'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, RotateCcw, UserX, Search, ShieldAlert, Loader2, 
  UserCheck, Mail, Building2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// ==========================================
// TYPES
// ==========================================
interface UserDeleted {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: { libelle: string };
  statut: { libelle: string };
  deletedAt: string;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export default function AdminArchivesPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- REQUÊTE : Récupérer les utilisateurs supprimés ---
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['users-deleted'], 
    queryFn: () => fetchApi<ApiResponse<UserDeleted[]>>('/utilisateurs/deleted') 
  });

  // --- MUTATION : Restaurer un utilisateur ---
  const restoreMutation = useMutation({
    mutationFn: (id: string) => fetchApi<ApiResponse<any>>(`/utilisateurs/${id}/restore`, { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(res.message || "Utilisateur restauré avec succès");
      // On rafraîchit la corbeille ET la liste des professeurs
      queryClient.invalidateQueries({ queryKey: ['users-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['professeurs-liste'] }); 
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deletedUsers = data?.data || [];
  
  // Filtrage local par recherche textuelle
  const filteredUsers = deletedUsers.filter(u => 
    `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-destructive" /> Archives & Corbeille
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Gérez les comptes désactivés et restaurez l'accès du personnel si nécessaire.
          </p>
        </div>
      </motion.div>

      {/* FILTRE & LISTE */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/10 py-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" /> Comptes Suspendus
            </CardTitle>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher dans les archives..." 
                className="pl-9 bg-background/50 rounded-xl h-11" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Utilisateur</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Rôle / Statut</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Désactivé le</TableHead>
                <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell></TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-destructive font-bold">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-50" /> Erreur de chargement
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <UserCheck className="h-12 w-12 opacity-20" />
                      <p className="font-medium">Aucun compte archivé pour le moment.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredUsers.map((u) => (
                    <motion.tr 
                      key={u.id} 
                      layout
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-black text-sm uppercase border border-border/50">
                            {u.prenom[0]}{u.nom[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{u.prenom} {u.nom}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {u.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background border-border/50">
                            {u.role.libelle}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-1">
                            <Building2 className="h-3 w-3" /> {u.statut.libelle}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground">
                          {new Date(u.deletedAt).toLocaleDateString('fr-FR', { 
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </TableCell>

                      <TableCell className="text-right px-6">
                        <Button 
                          onClick={() => restoreMutation.mutate(u.id)}
                          disabled={restoreMutation.isPending}
                          className="h-9 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white border-none shadow-none font-bold transition-all"
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" /> Restaurer
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* FOOTER INFO */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-primary/5 p-4 rounded-xl border border-primary/10">
        <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
        <p>Les utilisateurs restaurés retrouveront immédiatement leurs accès et leurs attributions en cours.</p>
      </div>

    </div>
  );
}