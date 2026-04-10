'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole } from '@/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  getUserRole: () => UserRole | '';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      logout: () => {
        set({ user: null, isAuthenticated: false });
        // Optionnel : On peut aussi appeler l'API de logout ici si besoin
      },

      getUserRole: () => {
        const user = get().user;
        if (!user) return '';

        const role = user.role;
        if (typeof role === 'object' && role !== null && 'libelle' in role) {
          return role.libelle as UserRole;
        }

        return role as UserRole;
      },
    }),
    {
      name: 'adc-auth-storage', // Le nom de la clé dans le localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);