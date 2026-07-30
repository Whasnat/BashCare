import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OnboardingTour from './OnboardingTour';
import useAuthStore from '../store/authStore';

export default function Layout() {
  const { user, impersonation, platformSettings } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {platformSettings?.system_announcement && (
        <div style={{
          background: 'var(--accent-primary)',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.85rem',
          zIndex: 1000,
        }}>
          {platformSettings.system_announcement}
        </div>
      )}
      {impersonation?.active && (
        <div style={{
          background: 'var(--accent-warning)',
          color: '#854d0e',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: '0.85rem',
          zIndex: 1000,
          position: 'sticky',
          top: 0
        }}>
          <div>🕵️ You are currently viewing as <strong>{user?.company_name || 'Landlord'}</strong></div>
          <button 
            onClick={() => {
              const original = impersonation.originalToken;
              if (original) {
                // We're inside Layout, which means we can't easily require api without importing it,
                // but let's just write to localStorage or authStore and redirect to admin/dashboard
                useAuthStore.setState({
                  token: original,
                  impersonation: { active: false, originalToken: null }
                });
                // Force a reload to re-hydrate the correct user state from the /auth/me endpoint
                window.location.href = '/admin/dashboard';
              }
            }}
            style={{
              background: 'rgba(0,0,0,0.1)',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              color: '#713f12'
            }}
          >
            <LogOut size={14} /> Return to Admin
          </button>
        </div>
      )}
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <main className="main-content">
        <div className="page-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <OnboardingTour role={user?.role} />
    </div>
  );
}
