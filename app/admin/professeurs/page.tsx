'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { Search, MoreHorizontal, UserPen, Trash2, ShieldAlert, Plus, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==========================================
// TYPES STRICTS
// ==========================================
interface Institut { id: number; nom: string; }
interface RoleRef { id: number; libelle: string; }
interface StatutRef { id: number; libelle: string; quotaHeureMax: number; quotaPeriode: string; }

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: { libelle: string };
  statut: StatutRef;
  instituts: Institut[];
  // Ajout pour la jauge de charge horaire
  chargeHoraireActuelle?: number; 
}

interface RegisterPayload {
  nom: string; prenom: string; email: string; mdp: string;
  idRole?: number; idStatut?: number;
}

interface UpdatePayload {
  nom?: string; prenom?: string; idRole?: number; idStatut?: number;
}

interface ApiResponse<T> {
  success: boolean; count?: number; data: T; message?: string;
}

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function ProfesseursPage() {
  const queryClient = useQueryClient();
  
  // États de filtrage
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // Modale d'Ajout
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newUserData, setNewUserData] = useState({ nom: '', prenom: '', email: '', mdp: '', idRole: '', idStatut: '' });

  // Modale de Modification
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editUserData, setEditUserData] = useState<{ id: string, nom: string, prenom: string, idRole: string, idStatut: string } | null>(null);

  // Modale d'Assignation Institut
  const [isInstitutModalOpen, setIsInstitutModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);

  // --- REQUÊTES API ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-utilisateurs'],
    queryFn: () => fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs'),
  });

  const { data: rolesResponse } = useQuery({ queryKey: ['roles'], queryFn: () => fetchApi<ApiResponse<RoleRef[]>>('/referentiel/roles') });
  const { data: statutsResponse } = useQuery({ queryKey: ['statuts'], queryFn: () => fetchApi<ApiResponse<StatutRef[]>>('/statuts') });
  const { data: institutsResponse } = useQuery({ queryKey: ['instituts'], queryFn: () => fetchApi<ApiResponse<Institut[]>>('/instituts') });

  const utilisateurs = data?.data || [];

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Utilisateur désactivé');
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la désactivation'),
  });

  const addMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => fetchApi<ApiResponse<unknown>>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Utilisateur ajouté');
      setIsAddModalOpen(false);
      setNewUserData({ nom: '', prenom: '', email: '', mdp: '', idRole: '', idStatut: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: UpdatePayload }) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Utilisateur modifié avec succès');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la modification'),
  });

  const assignInstitutMutation = useMutation({
    mutationFn: (payload: { userId: string, institutId: number }) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${payload.userId}/instituts`, { method: 'POST', body: JSON.stringify({ institutId: payload.institutId }) }),
    onSuccess: () => {
      toast.success('Institut assigné avec succès');
      setIsInstitutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'assignation"),
  });

  // --- GESTIONNAIRES ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.nom || !newUserData.email || !newUserData.mdp) return toast.error('Champs obligatoires manquants');
    addMutation.mutate({
      nom: newUserData.nom, prenom: newUserData.prenom, email: newUserData.email, mdp: newUserData.mdp,
      ...(newUserData.idRole && { idRole: Number(newUserData.idRole) }),
      ...(newUserData.idStatut && { idStatut: Number(newUserData.idStatut) }),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserData) return;
    updateMutation.mutate({
      id: editUserData.id,
      payload: {
        nom: editUserData.nom, prenom: editUserData.prenom,
        ...(editUserData.idRole && { idRole: Number(editUserData.idRole) }),
        ...(editUserData.idStatut && { idStatut: Number(editUserData.idStatut) }),
      }
    });
  };

  const openEditModal = (u: Utilisateur) => {
    const currentRole = rolesResponse?.data?.find(r => r.libelle === u.role.libelle);
    setEditUserData({
      id: u.id, nom: u.nom, prenom: u.prenom,
      idRole: currentRole ? currentRole.id.toString() : '',
      idStatut: u.statut?.id.toString() || '',
    });
    setIsEditModalOpen(true);
  };

  // --- FILTRAGE ---
  const filteredUsers = utilisateurs.filter(user => {
    const matchSearch = user.nom.toLowerCase().includes(searchTerm.toLowerCase()) || user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || user.role?.libelle === roleFilter;
    return matchSearch && matchRole;
  });

  // --- RENDERERS ---
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge variant="destructive" className="font-bold shadow-sm">ADMIN</Badge>;
      case 'CHEF_ETABLISSEMENT': return <Badge className="bg-orange-500 hover:bg-orange-600 font-bold shadow-sm text-white">CHEF ÉTAB.</Badge>;
      case 'CHEF_DEPARTEMENT': return <Badge className="bg-blue-500 hover:bg-blue-600 font-bold shadow-sm text-white">CHEF DÉP.</Badge>;
      default: return <Badge variant="outline" className="border-primary/50 text-primary font-bold bg-primary/10">PROFESSEUR</Badge>;
    }
  };

  const rowVariants: Variants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="space-y-6">
      
      {/* EN-TÊTE ET BOUTON D'AJOUT */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Gestion du Personnel</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gérez les professeurs, chefs de département et administrateurs.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-sm outline-none">
            <Plus className="h-4 w-4" /> Nouvel Utilisateur
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Ajouter un utilisateur</DialogTitle>
              <DialogDescription>Créez un nouveau compte (Les Admins ne peuvent pas être créés ici).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Nom" required value={newUserData.nom} onChange={e => setNewUserData({...newUserData, nom: e.target.value})} className="bg-background/50 rounded-xl" />
                <Input placeholder="Prénom" required value={newUserData.prenom} onChange={e => setNewUserData({...newUserData, prenom: e.target.value})} className="bg-background/50 rounded-xl" />
              </div>
              <Input type="email" placeholder="Adresse Email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="bg-background/50 rounded-xl" />
              <Input type="password" placeholder="Mot de passe provisoire" required minLength={6} value={newUserData.mdp} onChange={e => setNewUserData({...newUserData, mdp: e.target.value})} className="bg-background/50 rounded-xl" />
              
              <div className="grid grid-cols-2 gap-4">
                <Select value={newUserData.idRole} onValueChange={(val: string | null) => val && setNewUserData({...newUserData, idRole: val})}>
                  <SelectTrigger className="bg-background/50 rounded-xl">
                    <SelectValue placeholder="Choisir un rôle">
                      {newUserData.idRole ? rolesResponse?.data?.find(r => r.id.toString() === newUserData.idRole)?.libelle : "Choisir un rôle"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {rolesResponse?.data?.map(role => <SelectItem key={role.id} value={role.id.toString()}>{role.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newUserData.idStatut} onValueChange={(val: string | null) => val && setNewUserData({...newUserData, idStatut: val})}>
                  <SelectTrigger className="bg-background/50 rounded-xl">
                    <SelectValue placeholder="Choisir un statut">
                      {newUserData.idStatut ? statutsResponse?.data?.find(s => s.id.toString() === newUserData.idStatut)?.libelle : "Choisir un statut"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {statutsResponse?.data?.map(statut => <SelectItem key={statut.id} value={statut.id.toString()}>{statut.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={addMutation.isPending} className="w-full rounded-xl font-bold h-11">
                  {addMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Créer le compte'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* MODALE DE MODIFICATION (PATCH) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifiez les informations personnelles ou le rôle.</DialogDescription>
          </DialogHeader>
          {editUserData && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Nom" required value={editUserData.nom} onChange={e => setEditUserData({...editUserData, nom: e.target.value})} className="bg-background/50 rounded-xl" />
                <Input placeholder="Prénom" required value={editUserData.prenom} onChange={e => setEditUserData({...editUserData, prenom: e.target.value})} className="bg-background/50 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={editUserData.idRole} onValueChange={(val: string | null) => val && setEditUserData({...editUserData, idRole: val})}>
                  <SelectTrigger className="bg-background/50 rounded-xl">
                    <SelectValue placeholder="Rôle">
                      {editUserData.idRole ? rolesResponse?.data?.find(r => r.id.toString() === editUserData.idRole)?.libelle : "Rôle"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {rolesResponse?.data?.map(role => <SelectItem key={role.id} value={role.id.toString()}>{role.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editUserData.idStatut} onValueChange={(val: string | null) => val && setEditUserData({...editUserData, idStatut: val})}>
                  <SelectTrigger className="bg-background/50 rounded-xl">
                    <SelectValue placeholder="Statut">
                      {editUserData.idStatut ? statutsResponse?.data?.find(s => s.id.toString() === editUserData.idStatut)?.libelle : "Statut"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">
                    {statutsResponse?.data?.map(statut => <SelectItem key={statut.id} value={statut.id.toString()}>{statut.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={updateMutation.isPending} className="w-full rounded-xl font-bold h-11">
                  {updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enregistrer les modifications'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE D'ASSIGNATION INSTITUT */}
      <Dialog open={isInstitutModalOpen} onOpenChange={setIsInstitutModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl bg-card/90 backdrop-blur-3xl border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Assigner à un Institut</DialogTitle>
            <DialogDescription>
              Ajouter <span className="font-bold text-foreground">{selectedUser?.nom} {selectedUser?.prenom}</span> à un institut.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 space-y-4">
            <Select onValueChange={(val: string | null) => {
              if (val && selectedUser) {
                assignInstitutMutation.mutate({ userId: selectedUser.id, institutId: Number(val) });
              }
            }}>
              <SelectTrigger className="bg-background/50 rounded-xl h-12">
                <SelectValue placeholder="Sélectionner un institut..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[200]">
                {institutsResponse?.data?.map(inst => (
                  <SelectItem key={inst.id} value={inst.id.toString()}>{inst.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* CARTE PRINCIPALE DE LA TABLE */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl shadow-black/5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />
        
        <CardHeader className="border-b border-border/40 pb-4 pt-6 px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-bold">Annuaire</CardTitle>
            
            <div className="flex w-full md:w-auto gap-3">
              <Select value={roleFilter} onValueChange={(val: string | null) => val && setRoleFilter(val)}>
                <SelectTrigger className="w-full md:w-[200px] bg-background/50 rounded-xl border-border/60">
                  <SelectValue placeholder="Filtrer par rôle">
                    {roleFilter === 'ALL' ? 'Tous les rôles' : roleFilter === 'CHEF_ETABLISSEMENT' ? 'Chefs d\'Établissement' : roleFilter === 'CHEF_DEPARTEMENT' ? 'Chefs de Département' : roleFilter === 'PROFESSEUR' ? 'Professeurs' : roleFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">Tous les rôles</SelectItem>
                  <SelectItem value="PROFESSEUR">Professeurs</SelectItem>
                  <SelectItem value="CHEF_DEPARTEMENT">Chefs de Départ.</SelectItem>
                  <SelectItem value="CHEF_ETABLISSEMENT">Chefs d'Établissement</SelectItem>
                  <SelectItem value="ADMIN">Administrateurs</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un nom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-background/50 border-border/60 rounded-xl focus-visible:ring-primary/30 h-10" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex h-64 flex-col items-center justify-center text-destructive">
              <ShieldAlert className="h-10 w-10 mb-2 opacity-50" />
              <p className="font-bold">Erreur de chargement des données</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Utilisateur</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Rôle & Instituts</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground w-[25%]">Charge Horaire</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Disponibilité</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody className="divide-y divide-border/40">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="hover:bg-transparent border-none">
                        <TableCell colSpan={5} className="py-4 px-6"><Skeleton className="h-10 w-full rounded-xl bg-muted/60" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium">Aucun utilisateur trouvé.</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u, i) => {
                      const isAdmin = u.role?.libelle === 'ADMIN';

                      // --- LOGIQUE DE LA JAUGE ---
                      const charge = u.chargeHoraireActuelle || 0; 
                      const max = u.statut?.quotaHeureMax || 1;
                      const pourcentage = Math.min(100, Math.round((charge / max) * 100));
                      
                      let progressColor = "bg-green-500";
                      if (pourcentage > 75) progressColor = "bg-orange-500";
                      if (pourcentage >= 100) progressColor = "bg-destructive";

                      return (
                        <motion.tr key={u.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors group border-border/40">
                          
                          <TableCell className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground truncate">{u.nom} {u.prenom}</span>
                              <span className="text-xs text-muted-foreground font-medium truncate">{u.email}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-2 items-start">
                              {getRoleBadge(u.role?.libelle)}
                              {u.instituts && u.instituts.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {u.instituts.map(inst => <Badge key={inst.id} variant="secondary" className="text-[10px] bg-secondary/20 hover:bg-secondary/40">{inst.nom}</Badge>)}
                                </div>
                              ) : <span className="text-xs text-muted-foreground italic mt-1">Non assigné</span>}
                            </div>
                          </TableCell>

                          {/* 🔥 LA JAUGE DE CHARGE HORAIRE 🔥 */}
                          <TableCell>
                            <div className="space-y-1.5 pr-4">
                              <div className="flex justify-between text-xs font-bold items-center">
                                <span className="text-foreground">{u.statut?.libelle || 'Inconnu'}</span>
                                <span className="text-muted-foreground">{charge}H / {max}H</span>
                              </div>
                              <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                                <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${pourcentage}%` }} />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {pourcentage >= 100 ? (
                              <Badge variant="destructive" className="shadow-sm">Surchargé</Badge>
                            ) : pourcentage > 75 ? (
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">Presque plein</Badge>
                            ) : (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-sm">Disponible</Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right px-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger 
                                disabled={isAdmin}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors data-[state=open]:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Ouvrir le menu</span><MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl z-[100] p-1.5">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider px-2">Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => openEditModal(u)} className="cursor-pointer gap-2 font-medium rounded-lg">
                                    <UserPen className="h-4 w-4 text-primary" /> Modifier
                                  </DropdownMenuItem>
                                  
                                  {/* 🔥 BOUTON ASSIGNER INSTITUT MAINTENANT DISPONIBLE POUR TOUS 🔥 */}
                                  <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsInstitutModalOpen(true); }} className="cursor-pointer gap-2 font-medium rounded-lg">
                                    <Building2 className="h-4 w-4 text-orange-500" /> Assigner Institut
                                  </DropdownMenuItem>
                                  
                                </DropdownMenuGroup>

                                <DropdownMenuSeparator />
                                
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => { if(confirm("Voulez-vous vraiment désactiver ce compte ?")) deleteMutation.mutate(u.id); }} disabled={deleteMutation.isPending} className="cursor-pointer gap-2 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg">
                                    <Trash2 className="h-4 w-4" /> Désactiver
                                  </DropdownMenuItem>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}