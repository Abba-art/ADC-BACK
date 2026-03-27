'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { fetchApi } from '@/services/api';
import { User, ApiResponse } from '@/types/auth';

export function useAuth() {
  const { user, setUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        const response = await fetchApi<ApiResponse<User>>('/auth/me');
        if (isMounted) {
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            logout();
          }
        }
      } catch (error) {
        // 🔥 L'ANTIDOTE AU ZOMBIE TOKEN 🔥
        if (isMounted) {
          console.error("Session invalide ou expirée:", error);
          logout();
          
          // Au lieu de tourner en boucle, on l'envoie vers la route "Tue-Cookie"
          window.location.href = '/logout';
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [setUser, logout]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
}