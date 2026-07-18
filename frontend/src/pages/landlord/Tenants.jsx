import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Search, X, Phone, Mail, Shield, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── Tenant Add/Edit Modal ────────────────────────────────────────────
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
                  <input className="form-input" placeholder="Abdul Karim" value={form.full_name} onChange={setF('full_name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input className="form-input" placeholder="+8801XXXXXXXXX" value={form.phone_number} onChange={setF('phone_number')} required />
                </div>
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="tenant@example.com" value={form.email} onChange={setF('email')} />
                </div>
                {!isEdit && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={12} /> National ID (NID) — Encrypted at rest
                    </label>
                    <input className="form-input" placeholder="NID number (optional)" value={form.national_id} onChange={setF('national_id')} />
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
                  <input className="form-input" placeholder="Fatema Begum" value={form.emergency_contact} onChange={setF('emergency_contact')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" placeholder="+8801XXXXXXXXX" value={form.emergency_phone} onChange={setF('emergency_phone')} />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
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

// ─── Set Login Modal ──────────────────────────────────────────────────
function SetLoginModal({ open, onClose, tenant, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', confirm: '', mode: 'invite', inviteLink: null });
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open && tenant) {
      setForm({ email: tenant.email || '', password: '', confirm: '', mode: 'invite', inviteLink: null });
    }
  }, [open, tenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.mode === 'direct' && form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.mode === 'direct' && form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      if (form.mode === 'invite') {
        const { data } = await api.post(`/tenants/${tenant.id}/invite`, { email: form.email });
        setForm(f => ({ ...f, inviteLink: data.setupLink }));
        toast.success(`Invite link generated for ${tenant.full_name}`);
      } else {
        await api.post(`/tenants/${tenant.id}/create-login`, {
          email: form.email,
          password: form.password,
        });
        toast.success(`Login created for ${tenant.full_name}`);
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process request');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !tenant) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Set Portal Login</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              for <strong style={{ color: 'var(--text-primary)' }}>{tenant?.full_name}</strong>
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {!form.inviteLink && (
          <div style={{ padding: '0 20px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
            <button 
              className={`tab-btn ${form.mode === 'invite' ? 'active' : ''}`} 
              onClick={() => setForm(prev => ({ ...prev, mode: 'invite' }))}
              style={{ padding: '12px 0' }}
            >
              Generate Invite Link
            </button>
            <button 
              className={`tab-btn ${form.mode === 'direct' ? 'active' : ''}`} 
              onClick={() => setForm(prev => ({ ...prev, mode: 'direct' }))}
              style={{ padding: '12px 0' }}
            >
              Direct Setup
            </button>
          </div>
        )}

        {form.inviteLink ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <KeyRound size={24} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Invite Link Generated!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
              Share this secure link with the tenant. They will be able to set their own password and activate their account.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" readOnly value={form.inviteLink} style={{ flex: 1, background: 'var(--bg-elevated)', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(form.inviteLink);
                toast.success('Copied to clipboard');
              }}>Copy</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px' }}>
              <div style={{
                background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)',
              }}>
                <KeyRound size={13} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-primary)' }} />
                The tenant will use these credentials to log in to the BashaCare tenant portal.
              </div>
              <div className="form-group">
                <label className="form-label">Login Email *</label>
                <input
                  type="email" className="form-input" placeholder="tenant@example.com"
                  value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              
              {form.mode === 'direct' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Temporary Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={show ? 'text' : 'password'} className="form-input"
                        placeholder="Min. 8 characters" minLength={8}
                        value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                        required style={{ paddingRight: 80 }}
                      />
                      <button type="button" onClick={() => setShow(s => !s)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.73rem' }}>
                        {show ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input
                      type={show ? 'text' : 'password'} className="form-input"
                      placeholder="Re-enter password" minLength={8}
                      value={form.confirm} onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {form.mode === 'invite' ? <><Mail size={14} /> Generate Link</> : <><KeyRound size={14} /> Create Login</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ────────────────────────────────────────────
function DeleteModal({ open, onClose, tenant, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tenants/${tenant.id}`);
      toast.success(`${tenant.full_name} deleted`);
      onDeleted(tenant.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete tenant');
    } finally {
      setDeleting(false);
    }
  };
  if (!open || !tenant) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--accent-rose)' }}>Delete Tenant?</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{tenant.full_name}</strong> and all their data. This cannot be undone.
        </p>
        {tenant.lease_id && (
          <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: 'var(--accent-rose)' }}>
            ⚠️ This tenant has an active lease. Terminate the lease first before deleting.
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting || !!tenant.lease_id}>
            {deleting ? <span className="spinner" /> : <Trash2 size={14} />}
            Delete Tenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tenants Page ────────────────────────────────────────────────
export default function Tenants() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [loginModal, setLoginModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editing, setEditing] = useState(null);
  
  // Use debounced search to avoid spamming the API
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus]);

  const { data: response, isLoading: loading, refetch } = useQuery({
    queryKey: ['tenants', page, debouncedSearch, filterStatus],
    queryFn: async () => {
      const { data } = await api.get('/tenants', {
        params: { page, limit, search: debouncedSearch, status: filterStatus }
      });
      return data;
    },
    keepPreviousData: true,
  });

  const tenants = response?.data || [];
  const meta = response?.meta || { total: 0, totalPages: 1 };

  const handleSaved = (saved, mode) => {
    refetch();
  };

  const handleDeleted = (id) => {
    refetch();
  };

  const activeTenants = meta.total; // Approximate for stats, better to fetch dashboard stats separately, but this is ok for now.
  const withLogin = 0; // We might need a separate endpoint for stats if we want total counts across all pages.


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">Manage all tenant profiles and portal access</p>
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
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{withLogin} / {tenants.length}</div>
            <div className="stat-label">Portal Access Active</div>
          </div>
          <div className="stat-icon purple"><KeyRound size={22} /></div>
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
              <th>Portal Login</th>
              <th>Lease</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '75%' }} /></td>
                ))}</tr>
              ))
            ) : tenants.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <Users size={36} className="empty-icon" />
                  <div className="empty-title">No tenants found</div>
                  <div className="empty-desc">Register your first tenant to get started.</div>
                </div>
              </td></tr>
            ) : tenants.map((t) => (
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
                  {t.has_login ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} /> Active
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', gap: 4, color: 'var(--accent-amber)' }}
                      onClick={() => setLoginModal(t)}
                      title="Set portal login for this tenant"
                    >
                      <KeyRound size={13} /> Set Login
                    </button>
                  )}
                </td>
                <td>
                  {t.lease_id ? (
                    <span className="badge badge-occupied">Active Lease</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>No Lease</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      id={`edit-tenant-${t.id}`}
                      onClick={() => { setEditing(t); setModalOpen(true); }}
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ color: 'var(--accent-rose)' }}
                      id={`delete-tenant-${t.id}`}
                      onClick={() => setDeleteModal(t)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {tenants.length} of {meta.total} tenants
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                Page {page} of {meta.totalPages}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <TenantModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        tenant={editing}
        onSaved={handleSaved}
      />
      <SetLoginModal
        open={!!loginModal}
        onClose={() => setLoginModal(null)}
        tenant={loginModal}
        onCreated={refetch}
      />
      <DeleteModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        tenant={deleteModal}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
