// src/types/auth.ts

export type UserRole = 'ADMIN' | 'CHEF_ETABLISSEMENT' | 'CHEF_DEPARTEMENT' | 'PROFESSEUR';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  // Gère les deux formats : { libelle: 'ADMIN' } (Prisma) ou 'ADMIN' (String simple)
  role: UserRole | { libelle: UserRole };
  statut?: {
    id: number;
    libelle: string;
    quotaHeureMax: number;
    quotaPeriode: 'SEMESTRE' | 'ANNEE';
  };
  instituts?: { 
    id: number; 
    nom: string; 
    adresse?: string | null 
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number; // Utile pour les listes
}