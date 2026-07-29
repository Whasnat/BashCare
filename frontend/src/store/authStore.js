import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return {};
  }
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      propertyCode: null,
      propertyId: null,
      permissions: [],
      impersonation: { active: false, originalToken: null },
      onboarding: { isActive: true, step: 0 },

      startOnboarding: () => set({ onboarding: { isActive: true, step: 0 } }),
      advanceOnboarding: () => set((state) => ({ onboarding: { ...state.onboarding, step: state.onboarding.step + 1 } })),
      completeOnboarding: () => set({ onboarding: { isActive: false, step: 0 } }),

      validateUser: async (username, propertyCode) => {
        const { data } = await api.post('/auth/login/validate-user', { username, property_code: propertyCode });
        return data;
      },

      login: async (username, password, propertyCode) => {
        const { data } = await api.post('/auth/login', { username, password, property_code: propertyCode });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        const decoded = decodeJwt(data.token);
        
        set({ 
          user: data.user, 
          token: data.token, 
          isAuthenticated: true,
          propertyCode: decoded.property_code || null,
          propertyId: decoded.property_id || null,
          permissions: decoded.module_permissions || [],
          impersonation: { active: decoded.is_impersonating || false, originalToken: get().token }
        });
        return data.user;
      },

      hasPermission: (requiredPerm) => {
        const { user, permissions } = get();
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'landlord') return true;
        return permissions.includes(requiredPerm);
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          propertyCode: null,
          propertyId: null,
          permissions: [],
          impersonation: { active: false, originalToken: null }
        });
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
      partialize: (s) => ({ 
        user: s.user, 
        token: s.token, 
        isAuthenticated: s.isAuthenticated, 
        onboarding: s.onboarding,
        propertyCode: s.propertyCode,
        propertyId: s.propertyId,
        permissions: s.permissions,
        impersonation: s.impersonation
      }),
    }
  )
);

export default useAuthStore;
