import { useEffect, Component, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch on every window focus by default
      retry: 1, // Only retry failed requests once
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    },
  },
});

// Layouts (loaded eagerly — needed immediately)
import Layout from './components/Layout';

// ─── Lazy-loaded Pages (code splitting) ─────────────────────────────
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForcePasswordChange = lazy(() => import('./pages/auth/ForcePasswordChange'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const SetupAccount = lazy(() => import('./pages/auth/SetupAccount'));

// Landlord Pages
const Dashboard = lazy(() => import('./pages/landlord/Dashboard'));
const Properties = lazy(() => import('./pages/landlord/Properties'));
const Units = lazy(() => import('./pages/landlord/Units'));
const Occupants = lazy(() => import('./pages/landlord/Occupants'));
const Agreements = lazy(() => import('./pages/landlord/Agreements'));
const ReservationCalendar = lazy(() => import('./pages/landlord/ReservationCalendar'));
const Billing = lazy(() => import('./pages/landlord/Billing'));
const Payments = lazy(() => import('./pages/landlord/Payments'));
const Settings = lazy(() => import('./pages/landlord/Settings'));
const Reports = lazy(() => import('./pages/landlord/Reports'));
const Maintenance = lazy(() => import('./pages/landlord/Maintenance'));
const ActivityLog = lazy(() => import('./pages/landlord/ActivityLog'));

// Manager Pages
const Utilities = lazy(() => import('./pages/manager/Utilities'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLandlords = lazy(() => import('./pages/admin/AdminLandlords'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Tenant Portal Pages
const TenantDashboard = lazy(() => import('./pages/tenant/TenantDashboard'));
const TenantInvoices = lazy(() => import('./pages/tenant/TenantInvoices'));
const TenantInvoiceDetail = lazy(() => import('./pages/tenant/TenantInvoiceDetail'));
const TenantMaintenance = lazy(() => import('./pages/tenant/TenantMaintenance'));

// ─── Page Loading Spinner ────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--text-muted)',
    }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

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

// ─── Public Route Wrapper ─────────────────────────────────────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    if (user?.role === 'tenant') return <Navigate to="/portal/dashboard" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

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
  const fetchPlatformSettings = useAuthStore((state) => state.fetchPlatformSettings);
  const platformSettings = useAuthStore((state) => state.platformSettings);
  const user = useAuthStore((state) => state.user);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
    fetchPlatformSettings();
  }, [hydrateAuth, hydrateTheme, fetchPlatformSettings]);

  const isLoginPage = window.location.pathname.startsWith('/login');

  if (platformSettings?.maintenance_mode && user?.role !== 'admin' && !isLoginPage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🛠️</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>We'll be right back</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '1.1rem', lineHeight: 1.5 }}>
          The platform is currently undergoing scheduled maintenance. Please check back later.
        </p>
        {!user && (
          <a href="/login" style={{ marginTop: 32, fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
            Admin Login
          </a>
        )}
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)'
              }
            }}
          />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/force-change-password" element={<ForcePasswordChange />} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/setup" element={<PublicRoute><SetupAccount /></PublicRoute>} />

              {/* Landlord & Manager Routes */}
              <Route path="/" element={<ProtectedRoute allowedRoles={['landlord', 'manager']}><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="properties" element={<Properties />} />
                <Route path="units" element={<Units />} />
                <Route path="occupants" element={<Occupants />} />
                <Route path="agreements" element={<Agreements />} />
                <Route path="reservations" element={<ReservationCalendar />} />
                <Route path="billing" element={<Billing />} />
                <Route path="payments" element={<Payments />} />
                <Route path="utilities" element={<Utilities />} />
                <Route path="reports" element={<Reports />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="activity" element={<ActivityLog />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="landlords" element={<AdminLandlords />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Tenant Portal Routes */}
              <Route path="/portal" element={<ProtectedRoute allowedRoles={['tenant']}><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/portal/dashboard" replace />} />
                <Route path="dashboard" element={<TenantDashboard />} />
                <Route path="invoices" element={<TenantInvoices />} />
                <Route path="invoices/:id" element={<TenantInvoiceDetail />} />
                <Route path="maintenance" element={<TenantMaintenance />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
