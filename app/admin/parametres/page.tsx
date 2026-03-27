'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Settings, ShieldAlert, Edit, Loader2, UserCog, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Statut {
  id: number;
  libelle: string;
  quotaHeureMax: number;
  quotaPeriode: 'SEMESTRE' | 'ANNEE';
  _count?: { utilisateurs: number };
}

interface EditStatutForm {
  id: number;
  libelle: string;
  quotaHeureMax: string;
  quotaPeriode: string;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string }

const PERIODES = [
  { id: 'SEMESTRE', label: 'Par Semestre' },
  { id: 'ANNEE', label: 'Par Année Académique' }
];

export default function ParametresPage() {
  const queryClient = useQueryClient();

  // --- ÉTAT MODALE DE MODIFICATION ---
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<EditStatutForm | null>(null);

  // --- REQUÊTE API ---
  const { data: statutsReq, isLoading, isError } = useQuery({ 
    queryKey: ['statuts'], 
    queryFn: () => fetchApi<ApiResponse<Statut[]>>('/statuts') 
  });

  const statuts = statutsReq?.data || [];

  // --- MUTATION MODIFICATION ---
  const updateMutation = useMutation({
    mutationFn: (data: { id: number, payload: { quotaHeureMax: number, quotaPeriode: string } }) => fetchApi<ApiResponse<Statut>>(`/statuts/${data.id}`, { method: 'PATCH', body: JSON.stringify(data.payload) }),
    onSuccess: () => { toast.success('Quotas modifiés avec succès'); setOpenEdit(false); queryClient.invalidateQueries({ queryKey: ['statuts'] }); },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- GESTIONNAIRE ---
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    updateMutation.mutate({
      id: editForm.id,
      payload: { quotaHeureMax: Number(editForm.quotaHeureMax), quotaPeriode: editForm.quotaPeriode }
    });
  };

  // --- ANIMATIONS & HELPERS ---
  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
  const renderSkeletons = () => Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-border/40 hover:bg-transparent"><TableCell colSpan={4} className="py-4"><Skeleton className="h-8 w-full bg-muted/60" /></TableCell></TableRow>);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" /> Paramètres Généraux
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Configurez les limites d&#39;heures (Quotas) pour chaque statut administratif.</p>
      </motion.div>

      <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-80" />
        <CardHeader className="border-b border-border/40 pb-4 pt-6">
          <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /> Statuts et Quotas des Enseignants</CardTitle>
          <CardDescription>Les statuts sont figés. Vous pouvez uniquement ajuster les plafonds d&apos;heures.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="font-bold px-6 py-4">Statut Administratif</TableHead>
                <TableHead className="text-center">Volume Horaire Autorisé</TableHead>
                <TableHead className="text-center">Enseignants Rattachés</TableHead>
                <TableHead className="text-right px-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? renderSkeletons() : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 opacity-50" />Erreur de chargement</TableCell></TableRow>
              ) : statuts.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Aucun statut configuré dans la base.</TableCell></TableRow>
              ) : statuts.map((statut, i) => (
                <motion.tr key={statut.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 border-border/40">
                  <TableCell className="px-6 font-bold">{statut.libelle}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-primary/40 text-primary font-bold bg-primary/5">
                      <Clock className="w-3 h-3 mr-1.5" />
                      {statut.quotaHeureMax} Heures / {statut.quotaPeriode.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-secondary/20">{statut._count?.utilisateurs || 0} prof(s)</Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl font-bold text-primary border-primary/20 hover:bg-primary/10"
                      onClick={() => { setEditForm({ id: statut.id, libelle: statut.libelle, quotaHeureMax: statut.quotaHeureMax.toString(), quotaPeriode: statut.quotaPeriode }); setOpenEdit(true); }}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Ajuster le Quota
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- MODALE DE MODIFICATION DES QUOTAS --- */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 w-[95%] sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Ajuster les Quotas</DialogTitle>
            <DialogDescription>Modification de la limite pour le statut : <span className="font-bold text-foreground">{editForm?.libelle}</span></DialogDescription>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Quota Max (Heures)</label>
                  <Input type="number" min="1" required value={editForm.quotaHeureMax} onChange={e => setEditForm({...editForm, quotaHeureMax: e.target.value})} className="rounded-xl bg-background/50 h-12" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Période de calcul</label>
                  {/* 🔥 CORRECTION: L'événement typé (val: string | null) 🔥 */}
                  <Select value={editForm.quotaPeriode} onValueChange={(val: string | null) => { if(val) setEditForm({...editForm, quotaPeriode: val}) }}>
                    <SelectTrigger className="rounded-xl bg-background/50 h-12">
                      <SelectValue placeholder="Sélectionnez une période">
                        {PERIODES.find(p => p.id === editForm.quotaPeriode)?.label || "Sélectionnez"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-200">
                      {PERIODES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="w-full rounded-xl font-bold h-12 text-md mt-2">
                {updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enregistrer le nouveau quota'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}