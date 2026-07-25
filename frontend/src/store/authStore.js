import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      onboardingComplete: false,

      completeOnboarding: () => set({ onboardingComplete: true }),
      resetOnboarding: () => set({ onboardingComplete: false }),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data.user, token: data.token, isAuthenticated: true });
        return data.user;
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const { data } = await api.get('/auth/me');
        set({ user: data });
        return data;
      },

      hydrate: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'bashacare-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated, onboardingComplete: s.onboardingComplete }),
    }
  )
);

export default useAuthStore;
