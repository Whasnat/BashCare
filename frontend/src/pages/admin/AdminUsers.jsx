import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Shield, ShieldCheck, UserCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/toggle-active`);
      setUsers((us) => us.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u));
      toast.success(`User ${action}d`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.company_name || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadge = (role) => {
    const map = {
      admin: { bg: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)' },
      landlord: { bg: 'rgba(20,184,166,0.1)', color: 'var(--accent-primary)' },
      manager: { bg: 'rgba(99,102,241,0.1)', color: 'var(--accent-secondary)' },
      tenant: { bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)' },
    };
    const s = map[role] || map.tenant;
    return <span className="badge" style={{ background: s.bg, color: s.color, textTransform: 'capitalize' }}>{role}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Global User Directory</h1>
          <p className="page-subtitle">{users.length} users across all landlords</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchUsers}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Search by name, email, or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          {['all', 'admin', 'landlord', 'manager', 'tenant'].map((r) => (
            <button key={r} className={`tab-btn ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Company</th>
              <th>Last Login</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Users size={36} className="empty-icon" />
                  <div className="empty-title">No users found</div>
                </div>
              </td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: u.role === 'admin'
                        ? 'linear-gradient(135deg, var(--accent-rose), var(--accent-amber))'
                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, color: 'white'
                    }}>
                      {u.full_name?.charAt(0) || 'U'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{u.full_name || '—'}</div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{u.email}</td>
                <td>{roleBadge(u.role)}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{u.company_name || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-danger' : ''}`}
                      style={u.is_active ? { gap: 4 } : {
                        background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)',
                        border: '1px solid rgba(16,185,129,0.2)', gap: 4
                      }}
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
