import { useState, useEffect } from 'react';
import {
  Building2, CheckCircle2, XCircle, RefreshCw, Search,
  Plus, Eye, X, Mail, Phone, Calendar, Shield
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminLandlords() {
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | pending
  const [processing, setProcessing] = useState({});
  const [showDetail, setShowDetail] = useState(null); // landlord object or null
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    company_name: '', email: '', password: '', full_name: '', contact_phone: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchLandlords(); }, []);

  const fetchLandlords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/landlords');
      setLandlords(data);
    } catch {
      toast.error('Failed to load landlords');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (landlordId, action) => {
    const confirmMsg = action === 'approve'
      ? 'Approve this landlord? They will be able to log in and use the platform.'
      : 'Suspend this landlord? They will be locked out immediately.';
    if (!window.confirm(confirmMsg)) return;

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createForm.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setCreating(true);
    try {
      await api.post('/admin/landlords', createForm);
      toast.success('Landlord account created successfully');
      setShowCreate(false);
      setCreateForm({ company_name: '', email: '', password: '', full_name: '', contact_phone: '' });
      fetchLandlords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create landlord');
    } finally {
      setCreating(false);
    }
  };

  const filtered = landlords.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = (l.company_name || '').toLowerCase().includes(q) ||
      (l.contact_email || '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || (filter === 'active' ? l.is_active : !l.is_active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Landlord Directory</h1>
          <p className="page-subtitle">{landlords.length} registered landlords</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchLandlords}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create Landlord
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Search by company or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          {['all', 'active', 'pending'].map((f) => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
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
              [1,2,3,4].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8,9].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <Building2 size={36} className="empty-icon" />
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
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{l.contact_phone || '—'}</td>
                <td style={{ fontWeight: 700 }}>{l.property_count || 0}</td>
                <td>{l.unit_count || 0}</td>
                <td>{l.active_leases || 0}</td>
                <td>
                  <span className="badge" style={{
                    background: 'rgba(20,184,166,0.1)', color: 'var(--accent-primary)',
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
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className="btn btn-ghost btn-sm" title="View details"
                      onClick={() => setShowDetail(l)} style={{ padding: '4px 8px' }}>
                      <Eye size={14} />
                    </button>
                    {!l.is_active ? (
                      <button className="btn btn-sm"
                        style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.2)', gap: 4 }}
                        disabled={processing[l.id]} onClick={() => handleAction(l.id, 'approve')}>
                        {processing[l.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle2 size={13} />}
                        Approve
                      </button>
                    ) : (
                      <button className="btn btn-danger btn-sm" style={{ gap: 4 }}
                        disabled={processing[l.id]} onClick={() => handleAction(l.id, 'suspend')}>
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

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Landlord Details</h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowDetail(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label"><Building2 size={14} style={{ marginRight: 6 }} />Company</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)' }}>{showDetail.company_name}</div>
              </div>
              <div className="form-group">
                <label className="form-label"><Mail size={14} style={{ marginRight: 6 }} />Email</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)' }}>{showDetail.contact_email}</div>
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={14} style={{ marginRight: 6 }} />Phone</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)' }}>{showDetail.contact_phone || 'Not provided'}</div>
              </div>
              <div className="form-group">
                <label className="form-label"><Shield size={14} style={{ marginRight: 6 }} />Plan</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)', textTransform: 'capitalize' }}>{showDetail.plan_tier || 'starter'}</div>
              </div>
              <div className="form-group">
                <label className="form-label"><Calendar size={14} style={{ marginRight: 6 }} />Joined</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)' }}>
                  {new Date(showDetail.created_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div className="form-input" style={{ background: 'var(--bg-elevated)' }}>
                  <span className={`badge ${showDetail.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                    {showDetail.is_active ? 'Active' : 'Pending Approval'}
                  </span>
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Portfolio Summary</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Properties', value: showDetail.property_count || 0 },
                    { label: 'Units', value: showDetail.unit_count || 0 },
                    { label: 'Active Leases', value: showDetail.active_leases || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="stat-card teal" style={{ padding: 12 }}>
                      <div className="stat-content">
                        <div className="stat-value" style={{ fontSize: '1.2rem' }}>{value}</div>
                        <div className="stat-label">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Landlord Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Landlord Account</h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input className="form-input" required value={createForm.company_name}
                      onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-input" type="email" required value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={createForm.contact_phone}
                      onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" required minLength={8} value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Minimum 8 characters" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={15} />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
