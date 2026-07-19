import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, X, Search, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

function LeaseModal({ open, onClose, units, tenants, onSaved }) {
  const [form, setForm] = useState({
    unit_id: '', tenant_id: '', base_rent: '',
    security_deposit: '', utility_tariff: '',
    start_date: '', end_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { t } = useTranslation();

  const setF = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setIsDirty(true); };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  };

  useEffect(() => {
    if (open) {
      setForm({
        unit_id: '', tenant_id: '', base_rent: '',
        security_deposit: '', utility_tariff: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '', notes: '',
      });
      setIsDirty(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.unit_id || !form.tenant_id || !form.base_rent || !form.start_date) {
      return toast.error('Unit, tenant, base rent, and start date are required');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/leases', {
        ...form,
        base_rent: parseFloat(form.base_rent),
        security_deposit: parseFloat(form.security_deposit || 0),
        utility_tariff: parseFloat(form.utility_tariff || 0),
      });
      onSaved(data);
      toast.success('Lease created successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create lease');
    } finally {
      setSaving(false);
    }
  };

  const vacantUnits = units.filter((u) => u.status === 'VACANT');

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('leases.createLease')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Assignment */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Lease Assignment
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vacant Unit *</label>
                  <select
                    className="form-select"
                    value={form.unit_id}
                    onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                    required
                  >
                    <option value="">Select a unit…</option>
                    {vacantUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_number} — {u.property_name}
                      </option>
                    ))}
                  </select>
                  {vacantUnits.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: 4 }}>
                      No vacant units available. Add units in the Units section first.
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant *</label>
                  <select
                    className="form-select"
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    required
                  >
                    <option value="">Select a tenant…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.phone_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Financial Terms */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Financial Terms
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Base Rent (৳) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={t('leases.phBaseRent')}
                    value={form.base_rent}
                    onChange={(e) => setForm({ ...form, base_rent: e.target.value })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Deposit (৳)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={t('leases.phSecurityDeposit')}
                    value={form.security_deposit}
                    onChange={(e) => setForm({ ...form, security_deposit: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Utility Tariff (৳/unit)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={t('leases.phUtilityTariff')}
                    value={form.utility_tariff}
                    onChange={(e) => setForm({ ...form, utility_tariff: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            {/* Dates */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Lease Period
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date (optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Notes / Special Terms</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder={t('leases.phNotes')}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={15} />}
              {t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TerminateModal({ open, lease, onClose, onTerminated }) {
  const [terminating, setTerminating] = useState(false);
  const { t } = useTranslation();
  const handleTerminate = async () => {
    setTerminating(true);
    try {
      await api.patch(`/leases/${lease.id}/terminate`);
      toast.success('Lease terminated. Unit marked as Vacant.');
      onTerminated(lease.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to terminate lease');
    } finally {
      setTerminating(false);
    }
  };
  if (!open || !lease) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} style={{ display: 'inline', marginRight: 6 }} />
            Terminate Lease?
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
          This will terminate the lease for{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{lease.tenant_name}</strong>{' '}
          in unit <strong style={{ color: 'var(--text-primary)' }}>{lease.unit_number}</strong>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          The unit will be marked as Vacant and a termination timestamp will be recorded.
          This cannot be undone.
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-danger" onClick={handleTerminate} disabled={terminating}>
            {terminating ? <span className="spinner" /> : null}
            {t('leases.terminate')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Leases() {
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('active');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const { t } = useTranslation();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterActive]);

  const { data: response, isLoading: loading, refetch } = useQuery({
    queryKey: ['leases', page, debouncedSearch, filterActive],
    queryFn: async () => {
      const is_active = filterActive === 'all' ? undefined : filterActive === 'active';
      const { data } = await api.get('/leases', {
        params: { page, limit, search: debouncedSearch, is_active }
      });
      return data;
    },
    keepPreviousData: true,
  });

  const leases = response?.data || [];
  const meta = response?.meta || { total: 0, totalPages: 1 };

  // Fetch dropdown data for create form once
  useEffect(() => {
    api.get('/units').then(r => setUnits(r.data?.data || r.data)).catch(() => {});
    api.get('/tenants').then(r => setTenants(r.data?.data || r.data)).catch(() => {});
  }, []);

  const handleLeaseCreated = (newLease) => {
    refetch();
  };

  const handleTerminated = (leaseId) => {
    refetch();
  };

  const filtered = leases.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = (l.tenant_name || '').toLowerCase().includes(q) ||
      (l.unit_number || '').toLowerCase().includes(q) ||
      (l.property_name || '').toLowerCase().includes(q);
    const matchActive =
      filterActive === 'all' ? true :
      filterActive === 'active' ? l.is_active :
      !l.is_active;
    return matchSearch && matchActive;
  });

  const activeCount = leases.filter((l) => l.is_active).length;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('leases.title')}</h1>
          <p className="page-subtitle">{t('leases.subtitle')}</p>
        </div>
        <button className="btn btn-primary" id="create-lease-btn" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> {t('leases.createLease')}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">{t('leases.activeLeases')}</div>
          </div>
          <div className="stat-icon teal"><FileText size={22} /></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{leases.length - activeCount}</div>
            <div className="stat-label">{t('leases.pastLeases')}</div>
          </div>
          <div className="stat-icon amber"><Calendar size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">
              ৳{leases.filter((l) => l.is_active).reduce((s, l) => s + Number(l.base_rent || 0), 0).toLocaleString()}
            </div>
            <div className="stat-label">{t('leases.monthlyRentRoll')}</div>
          </div>
          <div className="stat-icon emerald"><FileText size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">{t('leases.allLeases')}</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="tabs">
              {['active', 'past', 'all'].map((s) => (
                <button key={s} className={`tab-btn ${filterActive === s ? 'active' : ''}`} onClick={() => setFilterActive(s)}>
                  {s === 'active' ? t('common.active') : s === 'past' ? t('leases.past') : t('common.all')}
                </button>
              ))}
            </div>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input
                placeholder={t('leases.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t('leases.tenant')}</th>
              <th>{t('leases.unit')}</th>
              <th>{t('leases.baseRent')}</th>
              <th>{t('leases.securityDeposit')}</th>
              <th>{t('leases.startDate')}</th>
              <th>{t('leases.endDate')}</th>
              <th>{t('common.status')}</th>
              <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : leases.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <FileText size={36} className="empty-icon" />
                  <div className="empty-title">No leases found</div>
                  <div className="empty-desc">Create a lease to assign a tenant to a unit.</div>
                </div>
              </td></tr>
            ) : leases.map((l) => (
              <tr key={l.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{l.tenant_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.tenant_phone}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{l.unit_number}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.property_name}</div>
                </td>
                <td className="font-mono font-bold">
                  ৳{Number(l.base_rent).toLocaleString()}
                </td>
                <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {l.security_deposit > 0 ? `৳${Number(l.security_deposit).toLocaleString()}` : '—'}
                </td>
                <td style={{ fontSize: '0.83rem' }}>{formatDate(l.start_date)}</td>
                <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  {l.end_date ? formatDate(l.end_date) : <span style={{ color: 'var(--text-muted)' }}>Open-ended</span>}
                </td>
                <td>
                  {l.is_active ? (
                    <span className="badge badge-occupied">Active</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>Terminated</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {l.is_active && (
                    <button
                      className="btn btn-danger btn-sm"
                      id={`terminate-lease-${l.id}`}
                      onClick={() => setTerminateTarget(l)}
                    >
                      Terminate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('common.showing')} {leases.length} {t('common.of')} {meta.total} {t('nav.leases').toLowerCase()}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common.previous')}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                {t('common.page')} {page} {t('common.of')} {meta.totalPages}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <LeaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        units={units}
        tenants={tenants}
        onSaved={handleLeaseCreated}
      />
      <TerminateModal
        open={!!terminateTarget}
        lease={terminateTarget}
        onClose={() => setTerminateTarget(null)}
        onTerminated={handleTerminated}
      />
    </div>
  );
}
