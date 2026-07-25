import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, DoorOpen, Users, FileText,
  Wallet, Receipt, Zap, PieChart, Settings, Home, X, Wrench, Activity, Calendar as CalendarIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';

const NAV_ITEMS = {
  landlord: [
    { labelKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.properties', path: '/properties', icon: Building2 },
    { labelKey: 'nav.units', path: '/units', icon: DoorOpen },
    { labelKey: 'nav.occupants', path: '/occupants', icon: Users },
    { labelKey: 'nav.agreements', path: '/agreements', icon: FileText },
    { labelKey: 'nav.reservations', path: '/reservations', icon: CalendarIcon },
    { labelKey: 'nav.billing', path: '/billing', icon: Receipt },
    { labelKey: 'nav.payments', path: '/payments', icon: Wallet },
    { labelKey: 'nav.utilities', path: '/utilities', icon: Zap },
    { labelKey: 'nav.maintenance', path: '/maintenance', icon: Wrench },
    { labelKey: 'nav.reports', path: '/reports', icon: PieChart },
    { labelKey: 'nav.activityLog', path: '/activity', icon: Activity },
    { labelKey: 'nav.settings', path: '/settings', icon: Settings },
  ],
  manager: [
    { labelKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.properties', path: '/properties', icon: Building2 },
    { labelKey: 'nav.units', path: '/units', icon: DoorOpen },
    { labelKey: 'nav.occupants', path: '/occupants', icon: Users },
    { labelKey: 'nav.agreements', path: '/agreements', icon: FileText },
    { labelKey: 'nav.billing', path: '/billing', icon: Receipt },
    { labelKey: 'nav.utilities', path: '/utilities', icon: Zap },
    { labelKey: 'nav.maintenance', path: '/maintenance', icon: Wrench },
  ],
  tenant: [
    { labelKey: 'nav.myDashboard', path: '/portal/dashboard', icon: Home },
    { labelKey: 'nav.myInvoices', path: '/portal/invoices', icon: Receipt },
    { labelKey: 'nav.maintenance', path: '/portal/maintenance', icon: Wrench },
  ],
  admin: [
    { labelKey: 'nav.adminDashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.landlords', path: '/admin/landlords', icon: Building2 },
    { labelKey: 'nav.allUsers', path: '/admin/users', icon: Users },
  ],
};

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const navLinks = NAV_ITEMS[user?.role] || NAV_ITEMS.landlord;

  const handleLogout = () => {
    if (window.confirm(t('common.confirmLogout'))) {
      logout();
    }
  };

  const sectionLabel = user?.role === 'tenant'
    ? t('nav.myAccount')
    : user?.role === 'admin'
      ? t('nav.administration')
      : t('nav.core');

  const logoSub = user?.role === 'tenant'
    ? t('nav.tenantPortal')
    : t('nav.enterpriseManagement');

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <Link to="/" className="logo-mark">
          <div className="logo-icon">B</div>
          <div>
            <div className="logo-text">Basha<span>Care</span></div>
            <div className="logo-sub">
              {logoSub}
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
          {sectionLabel}
        </div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);
          const tourId = user?.role === 'tenant' 
            ? 'tenant-' + item.path.replace('/portal/', '')
            : 'sidebar-' + item.path.replace('/', '');
            
          return (
            <Link key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`} data-tour-id={tourId}>
              <Icon className="nav-icon" size={18} />
              <span>{t(item.labelKey)}</span>
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
            <div className="user-role">{t('common.signOut')} ({user?.role})</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
