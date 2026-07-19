import { Menu, Bell, Sun, Moon, Monitor, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { t, i18n } = useTranslation();

  const cycleTheme = () => {
    const order = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('bashacare-lang', newLang);
    // Update document lang attribute for accessibility
    document.documentElement.setAttribute('lang', newLang);
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
          {t('common.welcome')} <span className="font-bold text-accent">{user?.company_name || user?.full_name}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-greeting topbar-greeting-desktop">
          {t('common.welcome')} <span className="font-bold text-accent">{user?.company_name || user?.full_name}</span>
        </div>
        {/* Language Toggle */}
        <button
          className="btn-icon btn-ghost lang-toggle-btn"
          onClick={toggleLanguage}
          aria-label={i18n.language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
          title={i18n.language === 'en' ? 'বাংলায় পরিবর্তন করুন' : 'Switch to English'}
          style={{ fontSize: '0.75rem', fontWeight: 700, gap: 4, display: 'flex', alignItems: 'center' }}
        >
          <Globe size={16} />
          <span>{i18n.language === 'en' ? 'বাং' : 'EN'}</span>
        </button>
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
