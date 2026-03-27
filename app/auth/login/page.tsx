'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ApiResponse, User } from '@/types/auth';
import { motion, Variants } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import IUGLoader from '@/components/ui/IUGLoader';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !mdp) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchApi<ApiResponse<User>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, mdp }),
      });

      if (res.success) {
        toast.success(res.message || "Connexion réussie !");
        setUser(res.data);
        const role = typeof res.data.role === 'object' ? res.data.role.libelle : res.data.role;

        switch (role) {
          case 'ADMIN': router.push('/admin/dashboard'); break;
          case 'CHEF_ETABLISSEMENT': 
          case 'CHEF_DEPARTEMENT': router.push('/chef/dashboard'); break;
          case 'PROFESSEUR': router.push('/professeur/dashboard'); break;
          default: router.push('/');
        }
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

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      <AnimatedBackground />

      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <IUGLoader size={200} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="z-10 w-full max-w-md">
        <Card className="relative overflow-hidden border border-border/60 bg-white/70 backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />
          
          <CardHeader className="space-y-2 text-center pt-10 pb-6">
            <CardTitle className="text-3xl font-black tracking-tight text-foreground">Portail Académique</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Connexion à votre espace</CardDescription>
          </CardHeader>
          
          <CardContent>
            <motion.form variants={containerVariants} initial="hidden" animate="show" onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Adresse Email</label>
                <Input type="email" placeholder="nom.prenom@iug-univ.cm" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/50 h-12 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
                  <a href="#" className="text-[11px] font-bold text-primary hover:underline transition-all">Oublié ?</a>
                </div>
                <Input type="password" placeholder="••••••••••••" value={mdp} onChange={(e) => setMdp(e.target.value)} required className="bg-white/50 h-12 rounded-xl text-sm transition-all focus-visible:ring-primary/30 focus-visible:border-primary border-border/60" />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-4">
                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 group" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
                  Accéder au tableau de bord
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2">
            <div className="text-center text-xs font-semibold text-muted-foreground">
              Pas encore de compte ? <Link href="/auth/register" className="text-primary hover:underline">Demander un accès</Link>
            </div>
            <p className="w-full text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              © 2026 Groupe IUG • ESG • ISTA • ISA
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}