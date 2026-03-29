'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { motion, Variants } from 'framer-motion';
import { BookOpen, Building2, Clock, GraduationCap, ShieldAlert, CheckCircle, Hourglass, MapPin, Printer, Filter, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// ==========================================
// TYPES
// ==========================================
interface Institut { id: number; nom: string; }
interface Enseignement {
  id: string;
  estActif: boolean;
  statutValidation: string;
  course: {
    matiere: { nom: string; code: string; credits: number; semestre: string };
    classe: { 
      code: string;
      filiere?: { instituts?: Institut[] };
    };
    annee: { libelle: string };
  };
}

interface ProfProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  statut: { libelle: string; quotaHeureMax: number; quotaPeriode: string };
  instituts: Institut[];
  enseignements: Enseignement[];
}

interface ApiResponse<T> { success: boolean; data: T; }

export default function ProfesseurDashboard() {
  const { user } = useAuthStore();
  const [filterInstitut, setFilterInstitut] = useState<string>('ALL');

  const { data: profileReq, isLoading, isError } = useQuery({
    queryKey: ['mon-profil', user?.id],
    queryFn: () => fetchApi<ApiResponse<ProfProfile>>(`/utilisateurs/${user?.id}?withCharge=true`),
    enabled: !!user?.id,
  });

  const profil = profileReq?.data;

  // ==========================================
  // LOGIQUE DE BASE (Charges & Instituts)
  // ==========================================
  const enseignementsValides = profil?.enseignements?.filter(e => e.statutValidation === 'VALIDE' || e.estActif) || [];
  
  const chargeActuelle = enseignementsValides.reduce((total, ens) => total + (ens.course.matiere.credits * 15), 0);
  const maxHeures = profil?.statut?.quotaHeureMax || 1;
  const pourcentage = Math.min(100, Math.round((chargeActuelle / maxHeures) * 100));

  let progressColor = "bg-green-500";
  if (pourcentage > 75) progressColor = "bg-orange-500";
  if (pourcentage >= 100) progressColor = "bg-destructive";

  const repartitionInstituts: Record<string, number> = {};
  const listeInstitutsUniques = new Set<string>();

  enseignementsValides.forEach(ens => {
    const instName = ens.course.classe.filiere?.instituts?.[0]?.nom || 'Non assigné';
    const hours = ens.course.matiere.credits * 15;
    repartitionInstituts[instName] = (repartitionInstituts[instName] || 0) + hours;
    listeInstitutsUniques.add(instName);
  });

  const filteredEnseignements = profil?.enseignements?.filter(ens => {
    if (filterInstitut === 'ALL') return true;
    const instName = ens.course.classe.filiere?.instituts?.[0]?.nom || 'Non assigné';
    return instName === filterInstitut;
  }) || [];

  // ==========================================
  // 🔥 LE CERVEAU : COMPARAISON N / N+1 🔥
  // ==========================================
  let nouveauxCours: Enseignement[] = [];
  let coursRetires: Enseignement[] = [];
  let anneeCourante = '';
  let anneePrecedente = '';

  if (profil && profil.enseignements.length > 0) {
    const anneesTriees = Array.from(new Set(profil.enseignements.map(e => e.course.annee.libelle))).sort().reverse();
    
    anneeCourante = anneesTriees[0];
    anneePrecedente = anneesTriees[1];

    if (anneeCourante && anneePrecedente) {
      const ensCourants = enseignementsValides.filter(e => e.course.annee.libelle === anneeCourante);
      const ensPrecedents = enseignementsValides.filter(e => e.course.annee.libelle === anneePrecedente);

      const getCourseSignature = (e: Enseignement) => `${e.course.matiere.code}-${e.course.classe.code}`;

      const signaturesCourantes = ensCourants.map(getCourseSignature);
      const signaturesPrecedentes = ensPrecedents.map(getCourseSignature);

      nouveauxCours = ensCourants.filter(e => !signaturesPrecedentes.includes(getCourseSignature(e)));
      coursRetires = ensPrecedents.filter(e => !signaturesCourantes.includes(getCourseSignature(e)));
    }
  }

  const handlePrint = () => window.print();

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (isLoading) return <div className="p-8"><Skeleton className="h-20 w-75 mb-6 rounded-xl" /><div className="grid grid-cols-3 gap-6"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div></div>;
  if (isError || !profil) return <div className="text-center p-10"><ShieldAlert className="w-10 h-10 mx-auto mb-2 text-destructive" />Erreur de chargement.</div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 print:space-y-4">
      
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary print:hidden" /> Espace Enseignant
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Bienvenue, <span className="font-bold text-foreground">{profil.nom} {profil.prenom}</span>.</p>
        </div>
      </motion.div>

      {/* 🔥 ALERTES DE CHANGEMENTS N / N+1 CORRIGÉE SANS LE COMPOSANT ALERT SHADCN 🔥 */}
      {(nouveauxCours.length > 0 || coursRetires.length > 0) && (
        <motion.div variants={itemVariants} className="print:hidden">
          <div className="flex gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm">
            <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col w-full">
              <h5 className="font-bold text-primary mb-2 text-base">Changements par rapport à l&apos;année précédente ({anneePrecedente})</h5>
              <div className="space-y-3">
                {nouveauxCours.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-green-600">Nouvelles affectations ({anneeCourante}) :</span>
                    {nouveauxCours.map(nc => (
                      <div key={nc.id} className="flex items-center text-sm gap-2 text-muted-foreground">
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                        <span className="font-bold">{nc.course.matiere.nom}</span> en <span className="font-bold">{nc.course.classe.code}</span>
                      </div>
                    ))}
                  </div>
                )}
                {coursRetires.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-sm font-semibold text-orange-600">Cours réattribués ou retirés :</span>
                    {coursRetires.map(cr => (
                      <div key={cr.id} className="flex items-center text-sm gap-2 text-muted-foreground">
                        <ArrowDownRight className="w-4 h-4 text-orange-500" />
                        <span className="font-bold">{cr.course.matiere.nom}</span> en <span className="font-bold">{cr.course.classe.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CARTES DE RÉSUMÉ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
        {/* CARTE 1 : STATUT ET QUOTA */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl border-border/40 overflow-hidden h-full print:shadow-none print:border-border">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary print:hidden" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 print:hidden" /> Charge Horaire Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-1">{chargeActuelle} H <span className="text-base font-medium text-muted-foreground">/ {maxHeures} H</span></div>
              <Badge variant="outline" className="mb-4 bg-background">{profil.statut.libelle}</Badge>
              <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden print:hidden">
                <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${pourcentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right print:hidden">{pourcentage}% du quota utilisé</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* CARTE 2 : COURS ASSIGNÉS */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl border-border/40 overflow-hidden h-full print:shadow-none print:border-border">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 print:hidden" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 print:hidden" /> Cours Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground mb-2">{enseignementsValides.length}</div>
              <p className="text-sm font-medium text-muted-foreground">Blocs d&apos;enseignement valides pour l&apos;année en cours.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* CARTE 3 : RÉPARTITION PAR INSTITUT */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 backdrop-blur-2xl shadow-xl border-border/40 overflow-hidden h-full flex flex-col print:shadow-none print:border-border">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 print:hidden" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 print:hidden" /> Répartition
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {Object.keys(repartitionInstituts).length === 0 ? (
                <div className="text-center text-muted-foreground"><p className="text-sm">Aucune heure consommée.</p></div>
              ) : (
                <div className="space-y-3 mt-1">
                  {Object.entries(repartitionInstituts).map(([instNom, heures]) => (
                    <div key={instNom} className="flex justify-between items-center bg-background/50 p-2 px-3 rounded-lg border border-border/40 print:bg-transparent print:p-1">
                      <span className="text-sm font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-orange-500 print:hidden" /> {instNom}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs print:border-border print:bg-transparent">{heures} H</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* TABLEAU DES COURS */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden border-border/40 print:shadow-none print:border-none">
          <CardHeader className="border-b border-border/40 pb-4 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:border-b-2">
            <div>
              <CardTitle>Mon Emploi du temps Global</CardTitle>
              <CardDescription className="print:hidden">Liste détaillée de vos affectations pédagogiques, toutes années confondues.</CardDescription>
            </div>
            
            {listeInstitutsUniques.size > 0 && (
              <div className="flex items-center gap-2 print:hidden">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterInstitut} onValueChange={(val) => setFilterInstitut(val || 'ALL')}>
                  <SelectTrigger className="w-50 bg-background/50 rounded-xl h-10 border-border/60 font-medium">
                    <SelectValue placeholder="Filtrer par institut" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="font-bold text-primary">Tous les instituts</SelectItem>
                    {Array.from(listeInstitutsUniques).map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table className="print:text-sm">
              <TableHeader className="bg-muted/30 print:bg-transparent">
                <TableRow className="border-border/40 print:border-b-2 print:border-black">
                  <TableHead className="font-bold px-6 py-4 print:px-2 text-foreground">Année</TableHead>
                  <TableHead className="font-bold py-4 print:px-2 text-foreground">Matière</TableHead>
                  <TableHead className="text-foreground print:px-2">Classe & Inst.</TableHead>
                  <TableHead className="text-foreground print:px-2">Charge</TableHead>
                  <TableHead className="text-right px-6 print:px-2 text-foreground">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40 print:divide-border">
                {filteredEnseignements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-medium">Aucun cours trouvé pour cette sélection.</TableCell></TableRow>
                ) : (
                  filteredEnseignements.sort((a, b) => b.course.annee.libelle.localeCompare(a.course.annee.libelle)).map((ens,) => {
                    const isValide = ens.statutValidation === 'VALIDE' || ens.estActif;
                    const instName = ens.course.classe.filiere?.instituts?.[0]?.nom || '';
                    
                    return (
                      <TableRow key={ens.id} className={`hover:bg-muted/20 border-border/40 print:break-inside-avoid ${!isValide ? 'opacity-70 print:opacity-100' : ''}`}>
                        <TableCell className="px-6 print:px-2">
                          <Badge variant="secondary" className="font-bold text-[11px] bg-secondary/30">{ens.course.annee.libelle}</Badge>
                        </TableCell>
                        <TableCell className="print:px-2 py-4">
                          <div className="font-bold text-foreground">{ens.course.matiere.nom}</div>
                          <div className="text-xs text-muted-foreground font-mono">{ens.course.matiere.code}</div>
                        </TableCell>
                        <TableCell className="print:px-2">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="outline" className="font-bold print:border-none print:px-0 print:text-base">{ens.course.classe.code}</Badge>
                            {instName && <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{instName}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold print:px-2">
                          {ens.course.matiere.credits * 15} H <span className="text-xs text-muted-foreground font-normal print:hidden">({ens.course.matiere.credits} Cr)</span>
                        </TableCell>
                        <TableCell className="text-right px-6 print:px-2">
                          {isValide ? (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-sm flex items-center w-max ml-auto gap-1 print:bg-transparent print:text-black print:border-none print:shadow-none print:p-0">
                              <CheckCircle className="w-3 h-3 print:hidden" /> Confirmé
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm flex items-center w-max ml-auto gap-1 print:bg-transparent print:text-gray-500 print:border-none print:shadow-none print:p-0">
                              <Hourglass className="w-3 h-3 print:hidden" /> En attente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}