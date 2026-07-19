import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, CheckCircle2, XCircle, Clock, Search, X, History, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

const METHOD_LABEL = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  MFS_PERSONAL: 'Mobile Banking',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
};

const METHOD_COLOR = {
  BKASH: 'rgba(233,7,108,0.1)',
  NAGAD: 'rgba(239,68,68,0.1)',
  ROCKET: 'rgba(99,102,241,0.1)',
  MFS_PERSONAL: 'rgba(20,184,166,0.1)',
  BANK_TRANSFER: 'rgba(245,158,11,0.1)',
  CASH: 'rgba(16,185,129,0.1)',
};
const METHOD_TEXT = {
  BKASH: '#e9076c',
  NAGAD: 'var(--accent-rose)',
  ROCKET: 'var(--accent-secondary)',
  MFS_PERSONAL: 'var(--accent-primary)',
  BANK_TRANSFER: 'var(--accent-amber)',
  CASH: 'var(--accent-emerald)',
};

// ─── Approve Modal ───────────────────────────────────────────
function ApproveModal({ payment, onClose, onConfirm }) {
  const [method, setMethod] = useState(payment?.method || 'BKASH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setMethod(payment.method || 'BKASH');
      setNotes('');
    }
  }, [payment]);

  if (!payment) return null;

  const handleApprove = async () => {
    setSaving(true);
    try {
      await onConfirm(payment.id, 'approve', method, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
            Confirm Payment
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Payment summary */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Tenant</span>
            <span style={{ fontWeight: 700 }}>{payment.tenant_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Amount Submitted</span>
            <span style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
              ৳{Number(payment.amount).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Transaction ID</span>
            <code style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 5, fontSize: '0.8rem', color: 'var(--accent-primary)', border: '1px solid var(--border)' }}>
              {payment.trx_id}
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Claimed Via</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{METHOD_LABEL[payment.method] || payment.method}</span>
          </div>
        </div>

        {/* Landlord confirms actual method */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Confirm Payment Method</label>
          <select
            className="form-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
          </select>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
            Select the method you actually received payment through
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Notes (optional)</label>
          <input
            className="form-input"
            placeholder={t('payments.phVerifiedBkash')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={saving}
            style={{ background: 'var(--accent-emerald)', minWidth: 140 }}
          >
            {saving ? <span className="spinner" /> : <CheckCircle2 size={15} />}
            {t('payments.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal ────────────────────────────────────────────
function RejectModal({ payment, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  if (!payment) return null;

  const handleReject = async () => {
    setSaving(true);
    try {
      await onConfirm(payment.id, 'reject', null, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />
            {t('payments.rejectPayment')}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.88rem' }}>
          Rejecting will move <strong style={{ color: 'var(--text-primary)' }}>{payment.tenant_name}'s</strong> submission of{' '}
          <strong style={{ color: 'var(--accent-rose)' }}>৳{Number(payment.amount).toLocaleString()}</strong> to rejected and revert the invoice status.
        </p>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Reason for rejection (optional)</label>
          <input
            className="form-input"
            placeholder={t('payments.phTrxNotFound')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={saving} style={{ minWidth: 130 }}>
            {saving ? <span className="spinner" /> : <XCircle size={15} />}
            {t('payments.reject')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function Payments() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'all'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const { t } = useTranslation();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page on tab/search change
  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);

  const { data: pendingPayments = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/payments/pending');
      return data;
    },
    enabled: tab === 'pending',
  });

  const { data: allResponse, isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['payments', 'all', page, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get('/payments/all', {
        params: { page, limit, search: debouncedSearch }
      });
      return data;
    },
    enabled: tab === 'all',
    keepPreviousData: true,
  });

  const allPayments = allResponse?.data || [];
  const meta = allResponse?.meta || { total: 0, totalPages: 1 };
  
  const loading = tab === 'pending' ? pendingLoading : allLoading;

  const handleVerify = async (paymentId, action, method, notes) => {
    try {
      const { data } = await api.patch(`/payments/${paymentId}/verify`, { action, method, notes });
      if (tab === 'pending') refetchPending();
      else refetchAll();
      toast.success(action === 'approve'
        ? `✅ Payment confirmed — Invoice: ${data.invoice_status}`
        : '❌ Payment rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process payment');
      throw err;
    }
  };

  const source = tab === 'pending' ? pendingPayments : allPayments;
  
  // Note: Local search filtering is only needed for pending tab now, since 'all' is server-side paginated & filtered
  const filtered = tab === 'pending' ? source.filter((p) => {
    const q = debouncedSearch.toLowerCase();
    return (p.tenant_name || '').toLowerCase().includes(q) ||
      (p.trx_id || '').toLowerCase().includes(q) ||
      (p.unit_number || '').toLowerCase().includes(q);
  }) : source;

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const StatusBadge = ({ status }) => {
    const map = {
      PENDING: { label: 'Pending', bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)' },
      VERIFIED: { label: 'Verified', bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)' },
      REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)' },
    };
    const s = map[status] || { label: status, bg: 'var(--bg-elevated)', color: 'var(--text-muted)' };
    return (
      <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('payments.title')}</h1>
          <p className="page-subtitle">{t('payments.subtitle')}</p>
        </div>
        {pendingPayments.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, padding: '8px 16px'
          }}>
            <Clock size={16} style={{ color: 'var(--accent-amber)' }} />
            <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.85rem' }}>
              {pendingPayments.length} awaiting review
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{pendingPayments.length}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-icon amber"><Clock size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">
              ৳{pendingPayments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}
            </div>
            <div className="stat-label">Pending Amount</div>
          </div>
          <div className="stat-icon emerald"><Wallet size={22} /></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">
              ৳{allPayments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}
            </div>
            <div className="stat-label">Total Verified</div>
          </div>
          <div className="stat-icon purple"><CheckCircle2 size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'pending', label: t('payments.pending'), icon: Clock },
              { key: 'all', label: t('payments.allHistory'), icon: History },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSearch(''); }}
                className="btn btn-sm"
                style={{
                  background: tab === key ? 'rgba(20,184,166,0.15)' : 'transparent',
                  color: tab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: tab === key ? '1px solid rgba(20,184,166,0.3)' : '1px solid transparent',
                  gap: 6,
                }}
              >
                <Icon size={13} />
                {label}
                {key === 'pending' && pendingPayments.length > 0 && (
                  <span style={{
                    background: 'var(--accent-amber)', color: '#000', borderRadius: '50%',
                    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 800, flexShrink: 0
                  }}>{pendingPayments.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="search-bar">
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder={t('payments.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t('billing.tenantUnit')}</th>
              <th>{t('units.unitNumber')}</th>
              <th>{t('billing.billingMonth')}</th>
              <th>{t('payments.amount')}</th>
              <th>{t('payments.method')}</th>
              <th>{t('payments.trxId')}</th>
              <th>{t('payments.date')}</th>
              {tab === 'all' && <th>{t('common.status')}</th>}
              {tab === 'pending' && <th style={{ textAlign: 'center' }}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={tab === 'pending' ? 8 : 8}>
                <div className="empty-state">
                  <CheckCircle2 size={36} className="empty-icon" style={{ color: 'var(--accent-emerald)' }} />
                  <div className="empty-title">
                    {search ? 'No matching payments' : tab === 'pending' ? 'All caught up!' : 'No payment history yet'}
                  </div>
                  <div className="empty-desc">
                    {search ? 'Try a different search term.' : tab === 'pending' ? 'No pending submissions to review.' : 'Payments will appear here once tenants start submitting.'}
                  </div>
                </div>
              </td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.tenant_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.tenant_phone}</div>
                </td>
                <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  {p.unit_number} · {p.property_name}
                </td>
                <td style={{ fontSize: '0.83rem' }}>
                  {p.billing_month ? new Date(p.billing_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}
                </td>
                <td className="font-mono font-bold" style={{ color: 'var(--accent-emerald)' }}>
                  ৳{Number(p.amount).toLocaleString()}
                </td>
                <td>
                  <span className="badge" style={{ background: METHOD_COLOR[p.method] || 'rgba(255,255,255,0.06)', color: METHOD_TEXT[p.method] || 'var(--text-secondary)' }}>
                    {METHOD_LABEL[p.method] || p.method}
                  </span>
                </td>
                <td>
                  {p.trx_id ? (
                    <code style={{
                      background: 'var(--bg-elevated)', padding: '2px 8px',
                      borderRadius: 6, fontSize: '0.78rem',
                      color: 'var(--accent-primary)', border: '1px solid var(--border)'
                    }}>
                      {p.trx_id}
                    </code>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDate(p.created_at)}
                </td>
                {tab === 'all' && <td><StatusBadge status={p.status} /></td>}
                {tab === 'pending' && (
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        className="btn btn-sm"
                        id={`approve-${p.id}`}
                        style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.2)', gap: 4 }}
                        onClick={() => setApproving(p)}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        id={`reject-${p.id}`}
                        style={{ gap: 4 }}
                        onClick={() => setRejecting(p)}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {tab === 'all' && meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('common.showing')} {filtered.length} {t('common.of')} {meta.total} {t('nav.payments').toLowerCase()}
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

      <ApproveModal
        payment={approving}
        onClose={() => setApproving(null)}
        onConfirm={handleVerify}
      />
      <RejectModal
        payment={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={handleVerify}
      />
    </div>
  );
}
