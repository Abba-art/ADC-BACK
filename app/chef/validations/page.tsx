'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ClipboardCheck, Clock,
  Loader2, AlertTriangle, Info
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import IUGLoader from '@/components/ui/IUGLoader';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  attributions?: { matiere: { credits: number } }[];
}

interface Attribution {
  id: string;
  utilisateurId: string;
  utilisateur: { nom: string; prenom: string };
  matiere: { nom: string; code: string; credits: number };
  classe: { code: string };
  annee: { id: number, libelle: string };
  statutValidation: 'PROPOSITION' | 'VALIDE' | 'REJETE';
  createdAt: string;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export default function ChefValidationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { getUserRole } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // --- ÉTATS POUR LA MODALE DE REJET ---
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [attributionToReject, setAttributionToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // --- CONSTANTE DU RATIO ---
  const RATIO_HEURES = 15;

  // --- SÉCURITÉ & MONTAGE ---
  useEffect(() => { 
    const timer = setTimeout(() => setMounted(true), 0); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      const role = getUserRole();
      if (role !== 'CHEF_ETABLISSEMENT' && role !== 'ADMIN') {
        router.replace('/chef/dashboard');
      }
    }
  }, [mounted, getUserRole, router]);

  // --- REQUÊTES API ---
  const { data: attrReq, isLoading: loadAttr } = useQuery({ 
    queryKey: ['attributions-validation'], 
    queryFn: () => fetchApi<ApiResponse<Attribution[]>>('/attributions/toutes') 
  });

  // On récupère les profs pour pouvoir calculer leur charge actuelle
  const { data: profsReq, isLoading: loadProfs } = useQuery({ 
    queryKey: ['professeurs-validation'], 
    queryFn: () => fetchApi<ApiResponse<Professeur[]>>('/utilisateurs/professeurs')
  });

  const isLoading = loadAttr || loadProfs;

  // --- MUTATION POUR VALIDER/REJETER ---
  const deciderMutation = useMutation({
    mutationFn: ({ id, decision, motif }: { id: string, decision: 'VALIDE' | 'REJETE', motif?: string }) => 
      fetchApi<ApiResponse<unknown>>(`/attributions/decider/${id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ decision, motif }) 
      }),
    onSuccess: (res, variables) => {
      toast.success(res.message || `Proposition ${variables.decision.toLowerCase()}e.`);
      queryClient.invalidateQueries({ queryKey: ['attributions-validation'] });
      queryClient.invalidateQueries({ queryKey: ['attributions'] });
      queryClient.invalidateQueries({ queryKey: ['professeurs-validation'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // --- TRAITEMENT DES DONNÉES ---
  const propositions = useMemo(() => {
    const props = attrReq?.data?.filter(a => a.statutValidation === 'PROPOSITION') || [];
    // Tri : les plus anciennes propositions (urgentes) en premier
    return props.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [attrReq?.data]);

  const professeurs = profsReq?.data || [];

  // --- ACTIONS ---
  const handleValider = (id: string) => {
    deciderMutation.mutate({ id, decision: 'VALIDE' });
  };

  const handleOpenReject = (id: string) => {
    setAttributionToReject(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return toast.error('Le motif de rejet est obligatoire.');
    if (attributionToReject) {
      deciderMutation.mutate({ id: attributionToReject, decision: 'REJETE', motif: rejectReason });
      setRejectModalOpen(false);
    }
  };

  // --- FONCTION D'AIDE : Calcul de la charge d'un prof ---
  const renderChargeIndicator = (utilisateurId: string, creditsProjetes: number) => {
    const prof = professeurs.find(p => p.id === utilisateurId);
    if (!prof) return null;

    const chargeActuelleCredits = prof.attributions?.reduce((sum, a) => sum + (a.matiere?.credits || 0), 0) || 0;
    const chargeActuelleHeures = chargeActuelleCredits * RATIO_HEURES;
    const heuresProjetees = creditsProjetes * RATIO_HEURES;
    const chargeFuture = chargeActuelleHeures + heuresProjetees;
    const quota = prof.statut.quotaHeureMax || 1;
    
    const pourcentageFuture = (chargeFuture / quota) * 100;
    const isOverQuota = chargeFuture > quota;
    const isNearQuota = pourcentageFuture >= 85 && !isOverQuota;

    return (
      <div className="flex flex-col items-end gap-1 mt-1 w-full max-w-[150px]">
        <div className="flex justify-between w-full text-[9px] font-bold uppercase tracking-wider">
          <span className="text-muted-foreground">Charge: {chargeActuelleHeures}H</span>
          <span className={isOverQuota ? "text-red-500" : isNearQuota ? "text-orange-500" : "text-primary"}>
             +{heuresProjetees}H
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden flex relative">
          <div className="h-full bg-primary" style={{ width: `${Math.min((chargeActuelleHeures / quota) * 100, 100)}%` }} />
          <div className={`h-full ${isOverQuota ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${Math.min((heuresProjetees / quota) * 100, 100)}%` }} />
        </div>
        {isOverQuota && <span className="text-[9px] font-black text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-0.5"/> Dépassement</span>}
      </div>
    );
  };

  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (!mounted) return <div className="flex h-screen items-center justify-center"><IUGLoader size={100} /></div>;

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Approbations en attente</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Passez en revue et prenez des décisions éclairées sur les assignations proposées.</p>
        </div>
      </motion.div>

      {/* EN-TÊTE D'INFORMATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl h-full flex flex-col justify-center">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Lot Actuel</p>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-black text-primary">{propositions.length}</span>
                  <span className="text-2xl font-bold text-foreground mt-2">Propositions</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium mt-2">En attente de la décision de la Direction Générale.</p>
              </div>
              <div className="hidden sm:flex h-20 w-20 bg-primary/10 items-center justify-center rounded-2xl">
                <ClipboardCheck className="h-10 w-10 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className={`border-none shadow-xl h-full flex flex-col justify-center transition-colors ${propositions.length > 0 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
            <CardContent className="pt-6">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Niveau d&apos;Urgence</p>
              <span className="text-3xl font-black">{propositions.length > 5 ? 'Élevé' : propositions.length > 0 ? 'Standard' : 'Aucune'}</span>
              <div className="mt-4 h-2 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: propositions.length > 0 ? '60%' : '0%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TABLEAU DES VALIDATIONS */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/10 py-5 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center">
            <Info className="w-5 h-5 mr-2 text-primary" /> Propositions à traiter
          </CardTitle>
          <Badge variant="outline" className="font-bold border-primary/20 text-primary uppercase">Les plus anciennes en premier</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Enseignant & Charge</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Matière / Volume (H)</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Classe / Année</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Date Propo.</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right px-6">Décision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell></TableRow>)
              ) : propositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-muted-foreground" /></div>
                      <p className="text-muted-foreground font-bold">Le registre est vide. Toutes les propositions ont été traitées.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                propositions.map((a, i) => (
                  <motion.tr key={a.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors">
                    
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
                            {a.utilisateur.prenom[0]}{a.utilisateur.nom[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{a.utilisateur.prenom} {a.utilisateur.nom}</span>
                          </div>
                        </div>
                        {/* 🔥 AJOUT DE LA JAUGE D'AIDE À LA DÉCISION */}
                        {renderChargeIndicator(a.utilisateurId, a.matiere.credits)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-sm">{a.matiere.nom}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-none font-bold uppercase">
                            {a.matiere.credits * RATIO_HEURES} H
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">{a.matiere.code} ({a.matiere.credits} ECTS)</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-sm">{a.classe.code}</span>
                        <span className="text-xs text-muted-foreground">{a.annee.libelle}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          onClick={() => handleValider(a.id)}
                          disabled={deciderMutation.isPending}
                          className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all hover:scale-110 active:scale-95"
                          title="Approuver cette proposition"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="outline"
                          size="icon" 
                          onClick={() => handleOpenReject(a.id)}
                          disabled={deciderMutation.isPending}
                          className="h-10 w-10 rounded-full text-red-500 border-red-500/30 hover:bg-red-500/10 transition-all hover:scale-110 active:scale-95"
                          title="Rejeter avec motif"
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>

                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* MODALE DE MOTIF DE REJET                                  */}
      {/* ========================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/40 bg-card/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-destructive flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2" /> Motif du Refus
            </DialogTitle>
            <DialogDescription>
              Veuillez indiquer obligatoirement la raison de ce rejet pour en informer le Chef de Département.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleConfirmReject} className="space-y-4 pt-4">
            <textarea 
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:border-destructive resize-none"
              placeholder="Ex: Le volume horaire de l'enseignant dépasse la limite réglementaire..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            
            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRejectModalOpen(false)} 
                className="rounded-xl h-11 font-bold"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                variant="destructive" 
                disabled={!rejectReason.trim() || deciderMutation.isPending} 
                className="rounded-xl h-11 font-bold shadow-lg shadow-red-500/20"
              >
                {deciderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirmer le Rejet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}