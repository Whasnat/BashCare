import { Menu, Bell } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuthStore();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="topbar-greeting topbar-greeting-mobile">
          Welcome back, <span className="font-bold text-accent">{user?.company_name || user?.full_name}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-greeting topbar-greeting-desktop">
          Welcome back, <span className="font-bold text-accent">{user?.company_name || user?.full_name}</span>
        </div>
        <button className="btn-icon btn-ghost notification-btn" aria-label="Notifications">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
