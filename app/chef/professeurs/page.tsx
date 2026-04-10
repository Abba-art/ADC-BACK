'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Search, Mail, Users, ShieldAlert, BookOpen, CalendarDays } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  attributions?: { matiere: { credits: number } }[];
}

interface Annee { id: number; libelle: string; }
interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export default function ChefProfesseursPage() {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // État local pour le filtre manuel
  const [selectedAnneeId, setSelectedAnneeId] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- REQUÊTES API ---
  // 1. Récupération des années
  const { data: anneesReq, isLoading: isLoadingAnnees } = useQuery({ 
    queryKey: ['annees-filtre'], 
    queryFn: () => fetchApi<ApiResponse<Annee[]>>('/structure/annees') 
  });

  // 🔥 SOLUTION AU USE_EFFECT : L'année active est soit celle cliquée, soit la première disponible par défaut
  const activeAnneeId = selectedAnneeId || (anneesReq?.data?.[0]?.id?.toString()) || '';

  // 2. Récupération des profs AVEC LE FILTRE D'ANNÉE ACTIF
  const { data, isLoading: isLoadingProfs, isError } = useQuery({ 
    queryKey: ['professeurs-liste', activeAnneeId], 
    queryFn: () => {
      const url = activeAnneeId 
        ? `/utilisateurs/professeurs?anneeId=${activeAnneeId}` 
        : '/utilisateurs/professeurs';
      return fetchApi<ApiResponse<Professeur[]>>(url);
    },
    // La requête s'active uniquement si on a bien une année valide
    enabled: !!activeAnneeId
  });

  const professeurs = data?.data || [];

  // --- FILTRAGE LOCAL (par nom/email) ---
  const filteredProfs = professeurs.filter(p => 
    `${p.nom} ${p.prenom} ${p.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  // RÈGLE MÉTIER : 1 Crédit = 15 Heures
  const RATIO_HEURES = 15;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">Équipe Pédagogique</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Surveillez le volume horaire consommé par année académique.
          </p>
        </div>
      </motion.div>

      {/* FILTRE & TABLEAU */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/10 py-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Annuaire & Suivi de Charge
              </CardTitle>
            </div>
            
            <div className="flex w-full md:w-auto items-center gap-3">
              {/* SÉLECTEUR D'ANNÉE */}
              <div className="w-full md:w-48">
                <Select 
                  value={activeAnneeId} 
                  onValueChange={(val) => {
                    // Force la valeur en string pour éviter l'erreur TypeScript (string | null)
                    if (val) setSelectedAnneeId(String(val));
                  }}
                  disabled={isLoadingAnnees}
                >
                  <SelectTrigger className="bg-background/50 rounded-xl h-11 border-primary/20 font-bold text-primary">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Année..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {anneesReq?.data?.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()} className="font-bold">
                        {a.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nom, prénom..." 
                  className="pl-9 bg-background/50 rounded-xl h-11" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Enseignant</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest min-w-[200px]">Volume Horaire Consommé</TableHead>
                <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest">Plafond</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoadingProfs || !activeAnneeId ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4} className="p-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell></TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-destructive"><ShieldAlert className="mx-auto mb-2 h-10 w-10 opacity-50" /><p className="font-bold">Erreur de chargement</p></TableCell></TableRow>
              ) : filteredProfs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium">Aucun professeur trouvé.</TableCell></TableRow>
              ) : (
                filteredProfs.map((p, i) => {
                  
                  // CALCULS EXACTS EN HEURES (Basés uniquement sur l'année sélectionnée)
                  const totalCredits = p.attributions?.reduce((sum, a) => sum + (a.matiere?.credits || 0), 0) || 0;
                  const chargeHeures = totalCredits * RATIO_HEURES;
                  
                  const quota = p.statut.quotaHeureMax || 1;
                  const pourcentage = Math.min((chargeHeures / quota) * 100, 100);
                  const isOverQuota = chargeHeures >= quota;
                  const isNearQuota = pourcentage >= 80 && !isOverQuota;

                  return (
                    <motion.tr key={p.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors">
                      
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm uppercase">
                            {p.prenom[0]}{p.nom[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{p.prenom} {p.nom}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {p.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-bold bg-muted/50 uppercase text-[10px] tracking-wider">
                          {p.statut.libelle}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1.5 w-full pr-4">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-muted-foreground">{chargeHeures} Heures</span>
                            <span className="font-bold text-foreground">{Math.round(pourcentage)}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${isOverQuota ? 'bg-red-500' : isNearQuota ? 'bg-orange-500' : 'bg-primary'}`}
                              style={{ width: `${pourcentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right px-6">
                         <div className="flex items-center justify-end gap-1.5 text-sm font-black text-foreground">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {quota}H <span className="text-[10px] text-muted-foreground font-medium uppercase">/ {p.statut.quotaPeriode === 'ANNEE' ? 'An' : 'Sem'}</span>
                         </div>
                      </TableCell>

                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}