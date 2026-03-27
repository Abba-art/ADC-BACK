'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/services/api';
import { ApiResponse, User } from '@/types/auth';
import { motion, Variants } from 'framer-motion';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner'; 

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import IUGLoader from '@/components/ui/IUGLoader';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function RegisterPage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom || !prenom || !email || !mdp || !confirmMdp) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    if (mdp.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (mdp !== confirmMdp) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchApi<ApiResponse<User>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nom, prenom, email, mdp }),
      });

      if (res.success) {
        toast.success(res.message || 'Compte créé avec succès ! Redirection...');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
} catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Identifiants incorrects ou problème serveur');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      <AnimatedBackground />

      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <IUGLoader size={200} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="z-10 w-full max-w-md pt-4">
        <Card className="relative overflow-hidden border border-border/60 bg-white/70 backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-secondary opacity-80" />
          
          <CardHeader className="space-y-2 text-center pt-8 pb-4">
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">Inscription</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-secondary">Rejoindre le corps enseignant</CardDescription>
          </CardHeader>
          
          <CardContent>
            <motion.form variants={containerVariants} initial="hidden" animate="show" onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nom</label>
                  <Input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="bg-white/50 h-10 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Prénom</label>
                  <Input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required className="bg-white/50 h-10 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
                </motion.div>
              </div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Adresse Email</label>
                <Input type="email" placeholder="nom.prenom@iug-univ.cm" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/50 h-10 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Mot de passe</label>
                <Input type="password" placeholder="••••••••••••" value={mdp} onChange={(e) => setMdp(e.target.value)} required className="bg-white/50 h-10 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirmer mot de passe</label>
                <Input type="password" placeholder="••••••••••••" value={confirmMdp} onChange={(e) => setConfirmMdp(e.target.value)} required className="bg-white/50 h-10 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-3">
                <Button type="submit" className="w-full h-11 rounded-xl text-sm font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 group" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Créer mon compte
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pb-6 pt-0">
            <div className="text-center text-xs font-semibold text-muted-foreground">
              Déjà un compte ? <Link href="/auth/login" className="text-secondary hover:underline">Se connecter</Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}