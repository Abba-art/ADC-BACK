'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/services/api';
import { motion, Variants } from 'framer-motion';
import { 
  Search, MoreHorizontal, UserPen, Trash2, ShieldAlert, Loader2, Building2, UserPlus, Mail
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';

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
  chargeHoraireActuelle?: number; 
}

interface RegisterPayload {
  nom: string; prenom: string; email: string; mdp: string;
  idRole?: number; idStatut?: number;
}

interface UpdatePayload {
  nom?: string; prenom?: string;
  idRole?: number; idStatut?: number;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; count?: number; }

export default function AdminPersonnelPage() {
  const queryClient = useQueryClient();
  
  // --- ÉTATS FILTRES ---
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // --- ÉTATS MODALES (Contrôlées pour éviter l'erreur asChild) ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ nom: '', prenom: '', email: '', mdp: '', idRole: '', idStatut: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState<{ id: string, nom: string, prenom: string, idRole: string, idStatut: string } | null>(null);

  const [isInstitutModalOpen, setIsInstitutModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [selectedInstitutId, setSelectedInstitutId] = useState<string>('');

  // --- REQUÊTES API ---
  const { data: usersReq, isLoading, isError } = useQuery({
    queryKey: ['admin-utilisateurs'],
    queryFn: () => fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs'),
  });

  const { data: rolesReq } = useQuery({ queryKey: ['roles'], queryFn: () => fetchApi<ApiResponse<RoleRef[]>>('/referentiel/roles') });
  const { data: statutsReq } = useQuery({ queryKey: ['statuts'], queryFn: () => fetchApi<ApiResponse<StatutRef[]>>('/statuts') });
  const { data: institutsResponse } = useQuery({ queryKey: ['instituts'], queryFn: () => fetchApi<ApiResponse<Institut[]>>('/instituts') });

  const utilisateurs = usersReq?.data || [];

  // --- MUTATIONS ---
  const addMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => fetchApi<ApiResponse<unknown>>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Utilisateur créé');
      setIsAddModalOpen(false);
      setNewUserData({ nom: '', prenom: '', email: '', mdp: '', idRole: '', idStatut: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: UpdatePayload }) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success(res.message || 'Utilisateur modifié avec succès');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Compte désactivé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignInstitutMutation = useMutation({
    mutationFn: (payload: { userId: string, institutId: number }) => fetchApi<ApiResponse<unknown>>(`/utilisateurs/${payload.userId}/instituts`, { method: 'POST', body: JSON.stringify({ institutId: payload.institutId }) }),
    onSuccess: () => {
      toast.success('Institut assigné avec succès');
      setIsInstitutModalOpen(false);
      setSelectedInstitutId('');
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // --- HANDLERS SOUMISSION ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      ...newUserData,
      idRole: newUserData.idRole ? Number(newUserData.idRole) : undefined,
      idStatut: newUserData.idStatut ? Number(newUserData.idStatut) : undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserData) return;
    updateMutation.mutate({
      id: editUserData.id,
      payload: {
        nom: editUserData.nom, prenom: editUserData.prenom,
        idRole: editUserData.idRole ? Number(editUserData.idRole) : undefined,
        idStatut: editUserData.idStatut ? Number(editUserData.idStatut) : undefined,
      }
    });
  };

  const handleAssignInstitutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && selectedInstitutId) {
      assignInstitutMutation.mutate({ userId: selectedUser.id, institutId: Number(selectedInstitutId) });
    } else {
      toast.error('Veuillez sélectionner un institut');
    }
  };

  // --- FILTRES ---
  const filteredUsers = utilisateurs.filter((u: Utilisateur) => {
    const matchesSearch = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role.libelle === roleFilter;
    return matchesSearch && matchesRole;
  });

  const rowVariants: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge variant="destructive" className="font-bold shadow-sm">ADMIN</Badge>;
      case 'CHEF_ETABLISSEMENT': return <Badge className="bg-orange-500 font-bold shadow-sm text-white border-none">CHEF ÉTAB.</Badge>;
      case 'CHEF_DEPARTEMENT': return <Badge className="bg-blue-500 font-bold shadow-sm text-white border-none">CHEF DÉP.</Badge>;
      default: return <Badge variant="outline" className="border-primary/50 text-primary font-bold bg-primary/10">PROFESSEUR</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Gestion du Personnel</h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">Administrez les accès et assignez les rôles du système ADC.</p>
        </div>

        {/* BOUTON D'AJOUT (Découplé du DialogTrigger pour éviter l'erreur asChild) */}
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-11 rounded-xl px-5 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Nouvel Utilisateur
        </Button>
      </motion.div>

      {/* FILTRES & TABLE */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/10">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un profil..." className="pl-9 bg-background/50 rounded-xl h-11" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {/* CORRECTION TypeScript : on s'assure que val n'est pas null */}
            <Select value={roleFilter} onValueChange={(val) => { if (val) setRoleFilter(val); }}>
              <SelectTrigger className="w-full md:w-48 bg-background/50 rounded-xl h-11"><SelectValue placeholder="Filtrer par rôle" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tous les rôles</SelectItem>
                <SelectItem value="PROFESSEUR">Professeurs</SelectItem>
                <SelectItem value="CHEF_DEPARTEMENT">Chefs de Dép.</SelectItem>
                <SelectItem value="CHEF_ETABLISSEMENT">Direction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40">
                <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest py-4">Utilisateur</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Rôle & Instituts</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Statut</TableHead>
                <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="p-4"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>)
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 font-medium text-muted-foreground">Aucun profil trouvé.</TableCell></TableRow>
              ) : (
                filteredUsers.map((u, i) => (
                  <motion.tr key={u.id} custom={i} initial="hidden" animate="show" variants={rowVariants} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{u.nom} {u.prenom}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" /> {u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 items-start">
                        {getRoleBadge(u.role.libelle)}
                        {u.instituts?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.instituts.map(inst => <Badge key={inst.id} variant="secondary" className="text-[10px] bg-secondary/10">{inst.nom}</Badge>)}
                          </div>
                        ) : <span className="text-[10px] text-muted-foreground italic">Non assigné</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold bg-muted/50">{u.statut?.libelle || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl">
                          <DropdownMenuGroup>
                            <DropdownMenuItem className="rounded-lg cursor-pointer py-2" onClick={() => {
                              setEditUserData({ id: u.id, nom: u.nom, prenom: u.prenom, idRole: rolesReq?.data?.find(r => r.libelle === u.role.libelle)?.id.toString() || '', idStatut: u.statut?.id.toString() || '' });
                              setIsEditModalOpen(true);
                            }}><UserPen className="h-4 w-4 mr-2 text-primary" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg cursor-pointer py-2" onClick={() => { setSelectedUser(u); setIsInstitutModalOpen(true); }}>
                              <Building2 className="h-4 w-4 mr-2 text-secondary" /> Assigner Institut
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-lg cursor-pointer py-2 text-destructive focus:bg-destructive/10" onClick={() => { if(confirm('Désactiver ce compte ?')) deleteMutation.mutate(u.id); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Désactiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* MODALES CONTRÔLÉES (Isolées du DOM principal)             */}
      {/* ========================================================= */}

      {/* --- MODALE AJOUT --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/40 bg-card/90 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Ajouter un membre</DialogTitle>
            <DialogDescription>Création d&apos;un nouveau compte pour le personnel.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-4" onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Nom" required value={newUserData.nom} onChange={e => setNewUserData({...newUserData, nom: e.target.value})} className="rounded-xl bg-background/50" />
              <Input placeholder="Prénom" required value={newUserData.prenom} onChange={e => setNewUserData({...newUserData, prenom: e.target.value})} className="rounded-xl bg-background/50" />
            </div>
            <Input type="email" placeholder="Email institutionnel" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="rounded-xl bg-background/50" />
            <Input type="password" placeholder="Mot de passe provisoire" required minLength={6} value={newUserData.mdp} onChange={e => setNewUserData({...newUserData, mdp: e.target.value})} className="rounded-xl bg-background/50" />
            
            <div className="grid grid-cols-2 gap-4">
              <Select value={newUserData.idRole} onValueChange={(val) => { if (val) setNewUserData({...newUserData, idRole: val}); }}>
                <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">{rolesReq?.data?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.libelle}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newUserData.idStatut} onValueChange={(val) => { if (val) setNewUserData({...newUserData, idStatut: val}); }}>
                <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">{statutsReq?.data?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.libelle}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full font-bold rounded-xl h-11" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODALE MODIFICATION --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card/90 backdrop-blur-2xl border-border/40">
          <DialogHeader><DialogTitle>Modifier Utilisateur</DialogTitle></DialogHeader>
          {editUserData && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Input required value={editUserData.nom} onChange={e => setEditUserData({...editUserData, nom: e.target.value})} className="rounded-xl bg-background/50" />
                <Input required value={editUserData.prenom} onChange={e => setEditUserData({...editUserData, prenom: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={editUserData.idRole} onValueChange={(val) => { if (val) setEditUserData({...editUserData, idRole: val}); }}>
                  <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Rôle" /></SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">{rolesReq?.data?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.libelle}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editUserData.idStatut} onValueChange={(val) => { if (val) setEditUserData({...editUserData, idStatut: val}); }}>
                  <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent className="rounded-xl z-[200]">{statutsReq?.data?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.libelle}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={updateMutation.isPending} className="w-full rounded-xl h-11 font-bold">
                  {updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Enregistrer les modifications"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODALE ASSIGNATION INSTITUT (UI Repensée & Corrigée) --- */}
      <Dialog open={isInstitutModalOpen} onOpenChange={setIsInstitutModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card/90 backdrop-blur-2xl border-border/40">
          <DialogHeader>
            <DialogTitle>Affectation Administrative</DialogTitle>
            <DialogDescription>
              Gérer les accès de <span className="font-bold text-foreground">{selectedUser?.nom} {selectedUser?.prenom}</span>.
            </DialogDescription>
          </DialogHeader>
          
          {/* Liste des instituts actuels */}
          <div className="bg-muted/30 p-3 rounded-xl border border-border/50 my-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Instituts actuels :</p>
            <div className="flex gap-2 flex-wrap">
              {selectedUser?.instituts && selectedUser.instituts.length > 0 ? (
                selectedUser.instituts.map(inst => (
                  <Badge key={inst.id} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{inst.nom}</Badge>
                ))
              ) : (
                <span className="text-xs italic text-muted-foreground">Cet utilisateur n&apos;est rattaché à aucun institut.</span>
              )}
            </div>
          </div>

          {/* Formulaire d'ajout */}
          <form onSubmit={handleAssignInstitutSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground ml-1">Ajouter à un nouvel Institut :</label>
              <Select value={selectedInstitutId} onValueChange={(val) => { if (val) setSelectedInstitutId(val); }}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50"><SelectValue placeholder="Choisir un institut..." /></SelectTrigger>
                <SelectContent className="rounded-xl z-[200]">
                  {institutsResponse?.data?.map(inst => (
                    <SelectItem key={inst.id} value={inst.id.toString()}>{inst.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button type="submit" className="w-full rounded-xl h-11 font-bold shadow-md shadow-primary/10" disabled={assignInstitutMutation.isPending || !selectedInstitutId}>
                {assignInstitutMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirmer l'assignation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}