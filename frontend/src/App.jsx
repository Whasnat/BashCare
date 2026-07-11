import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

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

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to role-appropriate home
    if (user?.role === 'tenant') return <Navigate to="/portal/dashboard" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#131e30', color: '#e8edf7', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
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
  );
}

export default App;
