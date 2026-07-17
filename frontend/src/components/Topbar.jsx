import { Menu, Bell, Sun, Moon, Monitor } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    const order = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

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
        <button
          className="btn-icon btn-ghost theme-toggle-btn"
          onClick={cycleTheme}
          aria-label={`Theme: ${themeLabel}. Click to change.`}
          title={`Theme: ${themeLabel}`}
        >
          <ThemeIcon size={18} />
        </button>
        <button className="btn-icon btn-ghost notification-btn" aria-label="Notifications">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
