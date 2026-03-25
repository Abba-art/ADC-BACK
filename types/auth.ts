// src/types/auth.ts

export type UserRole = 'ADMIN' | 'CHEF_ETABLISSEMENT' | 'CHEF_DEPARTEMENT' | 'PROFESSEUR';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole | { libelle: UserRole };
  statut?: {
    libelle: string;
    quotaHeureMax: number;
    quotaPeriode: 'SEMESTRE' | 'ANNEE';
  };
  instituts?: { id: number; nom: string }[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}