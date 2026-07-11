import { Bell, Search } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Topbar() {
  const { user } = useAuthStore();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="search-bar">
          <Search size={16} className="text-muted" />
          <input type="text" placeholder="Search tenants, units, or invoices..." />
        </div>
      </div>
      
      <div className="topbar-right">
        <div className="topbar-greeting">
          Welcome back, <span className="font-bold text-accent">{user?.company_name || user?.full_name}</span>
        </div>
        <button className="btn-icon btn-ghost relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
