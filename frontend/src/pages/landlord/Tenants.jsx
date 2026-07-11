import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Search, X, Phone, Mail, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function TenantModal({ open, onClose, tenant, onSaved }) {
  const isEdit = !!tenant;
  const [form, setForm] = useState({
    full_name: '', phone_number: '', email: '',
    national_id: '', emergency_contact: '', emergency_phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({
        full_name: tenant.full_name || '',
        phone_number: tenant.phone_number || '',
        email: tenant.email || '',
        national_id: '',
        emergency_contact: tenant.emergency_contact || '',
        emergency_phone: tenant.emergency_phone || '',
      });
    } else {
      setForm({ full_name: '', phone_number: '', email: '', national_id: '', emergency_contact: '', emergency_phone: '' });
    }
    setIsDirty(false);
  }, [tenant, open]);

  const setF = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setIsDirty(true); };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone_number) return toast.error('Name and phone number are required');
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.patch(`/tenants/${tenant.id}`, {
          full_name: form.full_name,
          phone_number: form.phone_number,
          email: form.email,
          emergency_contact: form.emergency_contact,
          emergency_phone: form.emergency_phone,
        });
        onSaved(data, 'edit');
        toast.success('Tenant profile updated');
      } else {
        const { data } = await api.post('/tenants', form);
        onSaved(data, 'add');
        toast.success('Tenant registered');
      }
      setIsDirty(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Tenant' : 'Register New Tenant'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Personal Info */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Personal Information
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    placeholder="Abdul Karim"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-input"
                    placeholder="+8801XXXXXXXXX"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="tenant@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                {!isEdit && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={12} /> National ID (NID) — Encrypted at rest
                    </label>
                    <input
                      className="form-input"
                      placeholder="NID number (optional)"
                      value={form.national_id}
                      onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Emergency Contact */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Emergency Contact
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="form-input"
                    placeholder="Fatema Begum"
                    value={form.emergency_contact}
                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    className="form-input"
                    placeholder="+8801XXXXXXXXX"
                    value={form.emergency_phone}
                    onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {isEdit ? 'Save Changes' : 'Register Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchTenants(); }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenants');
      setTenants(data);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved, mode) => {
    if (mode === 'add') fetchTenants();
    else setTenants((t) => t.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
  };

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = t.full_name.toLowerCase().includes(q) ||
      t.phone_number.includes(q) ||
      (t.email || '').toLowerCase().includes(q);
    const matchStatus =
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? !!t.lease_id :
      !t.lease_id;
    return matchSearch && matchStatus;
  });

  const activeTenants = tenants.filter((t) => t.lease_id).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">Manage all tenant profiles and contact information</p>
        </div>
        <button className="btn btn-primary" id="add-tenant-btn" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Register Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{tenants.length}</div>
            <div className="stat-label">Total Tenants</div>
          </div>
          <div className="stat-icon teal"><Users size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">{activeTenants}</div>
            <div className="stat-label">With Active Lease</div>
          </div>
          <div className="stat-icon emerald"><Users size={22} /></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{tenants.length - activeTenants}</div>
            <div className="stat-label">Without Lease</div>
          </div>
          <div className="stat-icon amber"><Users size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Tenant Directory</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="tabs">
              {['all', 'active', 'inactive'].map((s) => (
                <button key={s} className={`tab-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                  {s === 'all' ? 'All' : s === 'active' ? 'With Lease' : 'No Lease'}
                </button>
              ))}
            </div>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input
                placeholder="Search tenants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Unit</th>
              <th>Rent (৳)</th>
              <th>Lease Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '75%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Users size={36} className="empty-icon" />
                  <div className="empty-title">No tenants found</div>
                  <div className="empty-desc">Register your first tenant to get started.</div>
                </div>
              </td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `hsl(${(t.full_name.charCodeAt(0) * 7) % 360}, 60%, 25%)`,
                      border: `2px solid hsl(${(t.full_name.charCodeAt(0) * 7) % 360}, 60%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                      color: `hsl(${(t.full_name.charCodeAt(0) * 7) % 360}, 70%, 70%)`,
                    }}>
                      {t.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.full_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
                    <Phone size={12} /> {t.phone_number}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
                  {t.email ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={12} /> {t.email}
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>
                  {t.unit_number ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.unit_number}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.property_name}</div>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>No unit</span>}
                </td>
                <td className="font-mono">
                  {t.base_rent ? `৳${Number(t.base_rent).toLocaleString()}` : '—'}
                </td>
                <td>
                  {t.lease_id ? (
                    <span className="badge badge-occupied">Active Lease</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>No Lease</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    id={`edit-tenant-${t.id}`}
                    onClick={() => { setEditing(t); setModalOpen(true); }}
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TenantModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        tenant={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
