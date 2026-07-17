import { useEffect, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

// Layouts
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Landlord Pages
import Dashboard from './pages/landlord/Dashboard';
import Properties from './pages/landlord/Properties';
import Units from './pages/landlord/Units';
import Tenants from './pages/landlord/Tenants';
import Leases from './pages/landlord/Leases';
import Billing from './pages/landlord/Billing';
import Payments from './pages/landlord/Payments';
import Settings from './pages/landlord/Settings';
import Reports from './pages/landlord/Reports';

// Manager Pages
import Utilities from './pages/manager/Utilities';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Tenant Portal Pages
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantInvoices from './pages/tenant/TenantInvoices';
import TenantInvoiceDetail from './pages/tenant/TenantInvoiceDetail';

// Force Password Change Page
import ForcePasswordChange from './pages/auth/ForcePasswordChange';

// ─── Error Boundary ──────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '2rem',
          background: 'var(--bg-base)', color: 'var(--text-primary)',
          fontFamily: "'Inter', sans-serif", textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>
            😵 Something went wrong
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <pre style={{
            background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px',
            fontSize: '0.75rem', maxWidth: '600px', overflow: 'auto',
            color: 'var(--accent-rose)', marginBottom: '1.5rem',
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', borderRadius: '8px', border: 'none',
              background: 'var(--accent-primary)', color: 'white',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected Route Wrapper ──────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force password change gate
  if (user?.must_change_password) {
    return <Navigate to="/force-change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'tenant') return <Navigate to="/portal/dashboard" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
  }, [hydrateAuth, hydrateTheme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-text)',
            border: '1px solid var(--toast-border)',
          }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/force-change-password" element={<ForcePasswordChange />} />

          {/* Landlord & Manager Routes */}
          <Route path="/" element={<ProtectedRoute allowedRoles={['landlord', 'manager']}><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="units" element={<Units />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="leases" element={<Leases />} />
            <Route path="billing" element={<Billing />} />
            <Route path="payments" element={<Payments />} />
            <Route path="utilities" element={<Utilities />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Tenant Portal Routes */}
          <Route path="/portal" element={<ProtectedRoute allowedRoles={['tenant']}><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="dashboard" element={<TenantDashboard />} />
            <Route path="invoices" element={<TenantInvoices />} />
            <Route path="invoices/:id" element={<TenantInvoiceDetail />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
