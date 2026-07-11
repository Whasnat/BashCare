import { useState, useEffect, useCallback } from 'react';
import { Wallet, CheckCircle2, XCircle, Clock, Search, X, History, AlertTriangle } from 'lucide-react';
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
            placeholder="e.g. Verified in bKash app"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={saving}
            style={{ background: 'var(--accent-emerald)', minWidth: 140 }}
          >
            {saving ? <span className="spinner" /> : <CheckCircle2 size={15} />}
            Approve Payment
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
            Reject Payment?
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
            placeholder="e.g. TrxID not found in bKash app"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={saving} style={{ minWidth: 130 }}>
            {saving ? <span className="spinner" /> : <XCircle size={15} />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function Payments() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'all'
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/pending');
      setPendingPayments(data);
    } catch {
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/all');
      setAllPayments(data);
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'pending') fetchPending();
    else fetchAll();
  }, [tab, fetchPending, fetchAll]);

  const handleVerify = async (paymentId, action, method, notes) => {
    try {
      const { data } = await api.patch(`/payments/${paymentId}/verify`, { action, method, notes });
      setPendingPayments((prev) => prev.filter((p) => p.id !== paymentId));
      if (tab === 'all') fetchAll();
      toast.success(action === 'approve'
        ? `✅ Payment confirmed — Invoice: ${data.invoice_status}`
        : '❌ Payment rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process payment');
      throw err;
    }
  };

  const source = tab === 'pending' ? pendingPayments : allPayments;
  const filtered = source.filter((p) => {
    const q = search.toLowerCase();
    return (p.tenant_name || '').toLowerCase().includes(q) ||
      (p.trx_id || '').toLowerCase().includes(q) ||
      (p.unit_number || '').toLowerCase().includes(q);
  });

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
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Review and confirm tenant payment submissions</p>
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
              { key: 'pending', label: 'Pending', icon: Clock },
              { key: 'all', label: 'All History', icon: History },
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
              placeholder="Search tenant, unit or TrxID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th>Billing Month</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Date</th>
              {tab === 'all' && <th>Status</th>}
              {tab === 'pending' && <th style={{ textAlign: 'center' }}>Action</th>}
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
