import { useState, useEffect } from 'react';
import { ShieldCheck, Users, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [landlords, setLandlords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [landlordsRes, statsRes] = await Promise.all([
        api.get('/admin/landlords'),
        api.get('/admin/stats'),
      ]);
      setLandlords(landlordsRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (landlordId, action) => {
    setProcessing((p) => ({ ...p, [landlordId]: true }));
    try {
      await api.patch(`/admin/landlords/${landlordId}/${action}`);
      setLandlords((ls) =>
        ls.map((l) => l.id === landlordId ? { ...l, is_active: action === 'approve' } : l)
      );
      toast.success(`Landlord ${action === 'approve' ? 'approved' : 'suspended'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setProcessing((p) => ({ ...p, [landlordId]: false }));
    }
  };

  const filtered = landlords.filter((l) => {
    const q = search.toLowerCase();
    return (l.company_name || '').toLowerCase().includes(q) ||
      (l.contact_email || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Admin Portal</h1>
          <p className="page-subtitle">Platform-wide management and landlord oversight</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchAll}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Platform Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Landlords', value: stats?.total_landlords || 0, color: 'teal' },
          { label: 'Properties', value: stats?.total_properties || 0, color: 'purple' },
          { label: 'Units', value: stats?.total_units || 0, color: 'amber' },
          { label: 'Active Leases', value: stats?.active_leases || 0, color: 'emerald' },
          { label: 'Total Collected', value: `৳${Number(stats?.total_collected || 0).toLocaleString()}`, color: 'teal' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Landlord Management Table */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Landlord Accounts</h3>
          <div className="search-bar">
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search landlords…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Properties</th>
              <th>Units</th>
              <th>Active Leases</th>
              <th>Plan</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <Users size={36} className="empty-icon" />
                  <div className="empty-title">No landlords found</div>
                </div>
              </td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: l.is_active
                        ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                        : 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
                      color: l.is_active ? 'white' : 'var(--text-muted)'
                    }}>
                      {l.company_name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.company_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Joined {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{l.contact_email}</td>
                <td style={{ fontWeight: 700 }}>{l.property_count || 0}</td>
                <td>{l.unit_count || 0}</td>
                <td>{l.active_leases || 0}</td>
                <td>
                  <span className="badge" style={{
                    background: 'rgba(20,184,166,0.1)',
                    color: 'var(--accent-primary)',
                    textTransform: 'capitalize'
                  }}>
                    {l.plan_tier || 'starter'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${l.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                    {l.is_active ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {!l.is_active ? (
                      <button
                        className="btn btn-sm"
                        id={`approve-landlord-${l.id}`}
                        style={{
                          background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)',
                          border: '1px solid rgba(16,185,129,0.2)', gap: 4
                        }}
                        disabled={processing[l.id]}
                        onClick={() => handleAction(l.id, 'approve')}
                      >
                        {processing[l.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle2 size={13} />}
                        Approve
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        id={`suspend-landlord-${l.id}`}
                        style={{ gap: 4 }}
                        disabled={processing[l.id]}
                        onClick={() => handleAction(l.id, 'suspend')}
                      >
                        {processing[l.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <XCircle size={13} />}
                        Suspend
                      </button>
                    )}
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
