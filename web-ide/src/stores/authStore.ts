'use client';

import { create } from 'zustand';
import { api } from '@/lib/api/client';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const result = await api.login(email, password);
    
    if (result.data?.user) {
      set({ user: result.data.user, isAuthenticated: true });
      return { success: true };
    }
    
    return { success: false, error: result.error };
  },

  register: async (email, password, name) => {
    const result = await api.register(email, password, name);
    
    if (result.data?.user) {
      set({ user: result.data.user, isAuthenticated: true });
      return { success: true };
    }
    
    return { success: false, error: result.error };
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    const token = api.getToken();
    
    if (!token) {
      set({ isLoading: false, user: null, isAuthenticated: false });
      return;
    }

    const result = await api.getMe();
    
    if (result.data?.user) {
      set({ user: result.data.user, isAuthenticated: true, isLoading: false });
    } else {
      api.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
