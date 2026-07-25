import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Monitor, Globe, Check, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useNotifications from '../hooks/useNotifications';

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          data-tour-id="topbar-theme"
        >
          <ThemeIcon size={18} />
        </button>

        {/* Temporary Reset Tour Button */}
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => useAuthStore.getState().resetOnboarding()}
        >
          Reset Tour
        </button>
        
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="btn-icon btn-ghost notification-btn" 
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, background: 'var(--accent-rose)', 
                color: 'white', fontSize: '0.6rem', fontWeight: 'bold', 
                minWidth: 16, height: 16, borderRadius: 8, display: 'flex', 
                alignItems: 'center', justifyContent: 'center', padding: '0 4px'
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}>
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              
              <div className="notification-dropdown-body">
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: n.is_read ? 500 : 600, color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', marginTop: 4 }}></span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
