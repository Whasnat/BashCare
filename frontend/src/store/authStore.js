import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      onboarding: { isActive: true, step: 0 },

      startOnboarding: () => set({ onboarding: { isActive: true, step: 0 } }),
      advanceOnboarding: () => set((state) => ({ onboarding: { ...state.onboarding, step: state.onboarding.step + 1 } })),
      completeOnboarding: () => set({ onboarding: { isActive: false, step: 0 } }),

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
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated, onboarding: s.onboarding }),
    }
  )
);

export default useAuthStore;
