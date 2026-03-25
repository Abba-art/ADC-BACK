// src/hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { User, ApiResponse } from '@/types/auth';

export function useAuth() {
  const { setUser, isAuthenticated } = useAuthStore();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => fetchApi<ApiResponse<User>>('/auth/me'),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data?.success) {
      setUser(query.data.data);
    }
  }, [query.data, setUser]);

  return {
    isLoading: query.isLoading,
    user: query.data?.data,
    isAuthenticated: !!query.data?.success || isAuthenticated,
  };
}