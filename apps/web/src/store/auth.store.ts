import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { User } from '@avine/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (accessToken, user) => {
        set({ accessToken, user, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },
      logout: () => {
        set({ accessToken: null, user: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },
    }),
    {
      name: 'avine-auth',
    }
  )
);

// Initialize axios header from persisted state
const state = useAuthStore.getState();
if (state.accessToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
}
