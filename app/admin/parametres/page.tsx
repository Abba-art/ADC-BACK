'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  Settings, Edit, Loader2, ShieldAlert, Clock, Info, Users
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Statut {
  id: number;
  libelle: string;
  quotaHeureMax: number;
  quotaPeriode: 'SEMESTRE' | 'ANNEE';
  _count?: { utilisateurs: number };
}

interface ApiResponse<T> { success: boolean; data: T; message?: string }

const PERIODES = [
  { id: 'SEMESTRE', label: 'Par Semestre' },
  { id: 'ANNEE', label: 'Par Année Académique' }
];

export default function AdminParametresPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // --- CORRECTION ESLINT : Montage asynchrone ---
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- ÉTATS MODALE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ id: number, libelle: string, quotaHeureMax: string, quotaPeriode: string } | null>(null);

  // --- REQUÊTE API ---
  const { data: statutsReq, isLoading, isError } = useQuery({ 
    queryKey: ['admin-statuts'], 
    queryFn: () => fetchApi<ApiResponse<Statut[]>>('/statuts') 
  });

  const statuts = statutsReq?.data || [];

  // --- MUTATION ---
  const updateMutation = useMutation({
    mutationFn: (data: { id: number, payload: { quotaHeureMax: number, quotaPeriode: string } }) => 
      fetchApi<ApiResponse<Statut>>(`/statuts/${data.id}`, { method: 'PATCH', body: JSON.stringify(data.payload) }),
    onSuccess: () => { 
      toast.success('Règles de quota mises à jour avec succès'); 
      setIsEditModalOpen(false); 
      queryClient.invalidateQueries({ queryKey: ['admin-statuts'] }); 
      // On invalide aussi les utilisateurs car leur % de charge a peut-être changé !
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] }); 
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- HANDLER ---
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    updateMutation.mutate({
      id: editForm.id,
      payload: { 
        quotaHeureMax: Number(editForm.quotaHeureMax), 
        quotaPeriode: editForm.quotaPeriode 
      }
    });
  };

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
             <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground">Paramètres du Système</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">
              Gérez les règles métiers globales de l&lsquo;application ADC.
            </p>
          </div>
        </div>
      </motion.div>

      {/* BANNIÈRE D'INFORMATION */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
        <div className="bg-secondary/10 border border-secondary/20 p-5 rounded-2xl flex gap-4 items-start shadow-sm">
           <Info className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
           <div>
             <p className="text-base text-foreground font-bold">Impact global des quotas</p>
             <p className="text-sm text-muted-foreground font-medium mt-1">
               La modification du plafond d&#39;heures d&#39;un statut (ex: Vacataire) affectera immédiatement et rétroactivement le calcul du pourcentage de charge de tous les enseignants liés à ce statut dans leurs tableaux de bord respectifs.
             </p>
           </div>
        </div>
      </motion.div>

      {/* TABLEAU DES STATUTS */}
      <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
        <CardHeader className="border-b border-border/40 pb-5 pt-6 bg-muted/10">
          <CardTitle className="text-xl font-black">Statuts Contractuels</CardTitle>
          <CardDescription className="font-medium mt-1">Les statuts sont figés. Vous pouvez uniquement ajuster leurs plafonds d&lsquo;heures.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="font-bold px-6 py-4 uppercase text-[10px] tracking-widest text-muted-foreground">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Plafond Légal</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Enseignants Inscrits</TableHead>
                <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>)
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-destructive"><ShieldAlert className="mx-auto mb-2 h-10 w-10 opacity-50" /><p className="font-bold">Erreur de chargement</p></TableCell></TableRow>
              ) : (
                statuts.map((statut, i) => (
                  <motion.tr key={statut.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors group">
                    
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="font-black uppercase text-xs px-3 py-1 bg-background shadow-sm">
                        {statut.libelle}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold text-primary bg-primary/10 w-max px-3 py-1.5 rounded-lg text-sm">
                        <Clock className="w-4 h-4" /> 
                        {statut.quotaHeureMax} Heures / {statut.quotaPeriode === 'ANNEE' ? 'An' : 'Semestre'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground font-bold">
                        <Users className="w-4 h-4" />
                        {statut._count?.utilisateurs || 0} profils
                      </div>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <Button 
                        variant="outline" 
                        className="rounded-xl font-bold shadow-sm hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => { 
                          setEditForm({ 
                            id: statut.id, 
                            libelle: statut.libelle, 
                            quotaHeureMax: statut.quotaHeureMax.toString(), 
                            quotaPeriode: statut.quotaPeriode 
                          }); 
                          setIsEditModalOpen(true); 
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Ajuster la limite
                      </Button>
                    </TableCell>

                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* MODALE CONTRÔLÉE : AJUSTEMENT DES QUOTAS                    */}
      {/* ========================================================= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-border/40 bg-card/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Ajuster le plafond</DialogTitle>
            <DialogDescription>
              Modification de la politique pour le statut : <strong className="text-foreground uppercase">{editForm?.libelle}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {editForm && (
            <form onSubmit={handleEditSubmit} className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Heures Max</label>
                  <Input 
                    type="number" 
                    min="1" 
                    required 
                    value={editForm.quotaHeureMax} 
                    onChange={e => setEditForm({...editForm, quotaHeureMax: e.target.value})} 
                    className="rounded-xl h-11 font-black text-lg bg-background/50 border-border/60" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Période</label>
                  <Select value={editForm.quotaPeriode} onValueChange={(val) => { if(val) setEditForm({...editForm, quotaPeriode: val}) }}>
                    <SelectTrigger className="rounded-xl h-11 font-bold bg-background/50 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-[200]">
                      {PERIODES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" disabled={updateMutation.isPending} className="w-full rounded-xl font-bold h-11 shadow-lg shadow-primary/20">
                  {updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enregistrer les modifications'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}