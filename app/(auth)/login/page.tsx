'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, LogIn } from 'lucide-react';
import { motion, Variants } from 'framer-motion'; // IMPORT DE 'Variants' AJOUTÉ
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ApiResponse, User } from '@/types/auth';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IUGLoader from '@/components/ui/IUGLoader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetchApi<ApiResponse<User>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, mdp }),
      });

      if (res.success) {
        setUser(res.data);
        const role = typeof res.data.role === 'object' ? res.data.role.libelle : res.data.role;

        switch (role) {
          case 'ADMIN':
          case 'CHEF_ETABLISSEMENT': router.push('/admin/dashboard'); break;
          case 'CHEF_DEPARTEMENT': router.push('/chef/dashboard'); break;
          case 'PROFESSEUR': router.push('/professeur/dashboard'); break;
          default: router.push('/');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Identifiants incorrects ou problème serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CORRECTION TYPESCRIPT : Utilisation du type 'Variants' ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
  };
  
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 sm:p-8 overflow-hidden">
      
      {/* --- BACKGROUND ANIMÉ (Style Propulse / Vercel) --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Halo Vert ESG */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] h-125 w-125 rounded-full bg-iug-green/20 blur-[120px]" 
        />
        {/* Halo Orange ISTA */}
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] h-150 w-150 rounded-full bg-iug-orange/15 blur-[120px]" 
        />
        {/* Halo Bleu ISA */}
        <motion.div 
          animate={{ x: [0, 30, 0], y: [0, 80, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] left-[20%] h-100 w-100 rounded-full bg-iug-blue/15 blur-[100px]" 
        />
      </div>

      {/* Overlay de chargement pendant la requête API */}
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md"
        >
          <IUGLoader size={200} />
        </motion.div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className="z-10 w-full max-w-md">
        
        {/* En-tête avec le Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="relative mb-6 flex h-28 w-full max-w-50 items-center justify-center">
            {/* CORRECTION DU CHEMIN DU LOGO ICI */}
            <Image 
              src="/logo.png" 
              alt="Logo IUG" 
              fill 
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Portail Académique</h1>
          <p className="mt-3 text-sm font-bold text-gray-500 uppercase tracking-[0.2em]">
            Gestion des charges horaires
          </p>
        </motion.div>

        {/* Formulaire en Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* On utilise une div classique ici au lieu de Card pour forcer le Glassmorphism */}
          <div className="rounded-4xl bg-white/80 p-8 shadow-2xl shadow-gray-200/50 backdrop-blur-xl border border-white/60 relative overflow-hidden">
            
            {/* Petite ligne de décoration en haut de la carte */}
            <div className="absolute top-0 left-0 h-1.5 w-full bg-linear-to-r from-iug-green via-iug-orange to-iug-blue" />

            <motion.form 
              variants={containerVariants} 
              initial="hidden" 
              animate="show" 
              onSubmit={handleSubmit} 
              className="space-y-6 pt-2"
            >
              {error && (
                <motion.div variants={itemVariants} className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">!</span>
                  {error}
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="space-y-5">
                <Input
                  label="Adresse Email"
                  type="email"
                  placeholder="nom.prenom@iug-univ.cm"
                  icon={<Mail size={20} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Mot de passe"
                  type="password"
                  placeholder="••••••••••••"
                  icon={<Lock size={20} />}
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants} className="flex justify-end pt-1">
                <button type="button" className="text-sm font-bold text-iug-orange hover:text-[#d46d15] transition-colors">
                  Mot de passe oublié ?
                </button>
              </motion.div>

              <motion.div variants={itemVariants} className="pt-2">
                <Button type="submit" fullWidth isLoading={isLoading} icon={LogIn} variant="primary">
                  Se connecter
                </Button>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-xs font-bold text-gray-400"
        >
          © 2026 Institut Universitaire du Golfe de Guinée.<br />Tous droits réservés.
        </motion.p>
      </div>
    </div>
  );
}