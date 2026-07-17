import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, DoorOpen, Users, FileText,
  Wallet, Receipt, Zap, PieChart, Settings, Home, X
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV_ITEMS = {
  landlord: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Properties', path: '/properties', icon: Building2 },
    { label: 'Units', path: '/units', icon: DoorOpen },
    { label: 'Tenants', path: '/tenants', icon: Users },
    { label: 'Leases', path: '/leases', icon: FileText },
    { label: 'Billing & Ledger', path: '/billing', icon: Receipt },
    { label: 'Payments', path: '/payments', icon: Wallet },
    { label: 'Utilities', path: '/utilities', icon: Zap },
    { label: 'Reports', path: '/reports', icon: PieChart },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
  manager: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Properties', path: '/properties', icon: Building2 },
    { label: 'Units', path: '/units', icon: DoorOpen },
    { label: 'Tenants', path: '/tenants', icon: Users },
    { label: 'Leases', path: '/leases', icon: FileText },
    { label: 'Billing & Ledger', path: '/billing', icon: Receipt },
    { label: 'Utilities', path: '/utilities', icon: Zap },
  ],
  tenant: [
    { label: 'My Dashboard', path: '/portal/dashboard', icon: Home },
    { label: 'My Invoices', path: '/portal/invoices', icon: Receipt },
  ],
  admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Landlords', path: '/admin/landlords', icon: Building2 },
    { label: 'All Users', path: '/admin/users', icon: Users },
  ],
};

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();

  const navLinks = NAV_ITEMS[user?.role] || NAV_ITEMS.landlord;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <Link to="/" className="logo-mark">
          <div className="logo-icon">B</div>
          <div>
            <div className="logo-text">Basha<span>Care</span></div>
            <div className="logo-sub">
              {user?.role === 'tenant' ? 'Tenant Portal' : 'Enterprise Management'}
            </div>
          </div>
        </Link>
        {/* Close button for mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {user?.role === 'tenant' ? 'My Account' : user?.role === 'admin' ? 'Administration' : 'Core'}
        </div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon className="nav-icon" size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="user-info truncate">
            <div className="user-name truncate">{user?.full_name}</div>
            <div className="user-role">Sign Out ({user?.role})</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
