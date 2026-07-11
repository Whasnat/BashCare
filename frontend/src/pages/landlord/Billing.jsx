import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Search, X, ChevronDown, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  PAID: 'badge-paid',
  UNPAID: 'badge-unpaid',
  OVERDUE: 'badge-overdue',
  PENDING_VERIFICATION: 'badge-pending',
  PARTIALLY_PAID: 'badge-partial',
};

function GenerateModal({ open, onClose, leases, onGenerated }) {
  const [form, setForm] = useState({ lease_id: '', billing_month: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setForm({ lease_id: '', billing_month: month });
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/invoices/generate', form);
      onGenerated(data);
      toast.success('Invoice generated');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Invoice</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Lease / Tenant *</label>
              <select
                className="form-select"
                value={form.lease_id}
                onChange={(e) => setForm({ ...form, lease_id: e.target.value })}
                required
              >
                <option value="">Select an active lease…</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.tenant_name} — {l.unit_number} ({l.property_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Billing Month *</label>
              <input
                type="month"
                className="form-input"
                value={form.billing_month?.slice(0, 7)}
                onChange={(e) => setForm({ ...form, billing_month: e.target.value + '-01' })}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CashPaymentModal({ open, invoice, onClose, onPaid }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) setAmount(invoice.balance_remaining || invoice.amount_due || '');
  }, [invoice, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/payments/cash', {
        invoice_id: invoice.id,
        amount: parseFloat(amount),
        notes,
      });
      toast.success(`Payment of ৳${Number(amount).toLocaleString()} recorded`);
      onPaid(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !invoice) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Record Cash Payment</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Invoice for</div>
          <div style={{ fontWeight: 700 }}>{invoice.tenant_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {invoice.unit_number} · Balance due: <strong style={{ color: 'var(--accent-rose)' }}>
              ৳{Number(invoice.balance_remaining || invoice.amount_due).toLocaleString()}
            </strong>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Amount Received (৳) *</label>
              <input
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                className="form-input"
                placeholder="e.g. Received in person"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({ open, invoice, onClose, onAdjusted }) {
  const [form, setForm] = useState({ adjustment_type: 'DISCOUNT', amount: '', note: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const amt = form.adjustment_type === 'DISCOUNT' ? -Math.abs(parseFloat(form.amount)) : Math.abs(parseFloat(form.amount));
      await api.post(`/invoices/${invoice.id}/adjustments`, { ...form, amount: amt });
      toast.success('Adjustment added');
      onAdjusted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add adjustment');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !invoice) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Adjustment</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.adjustment_type}
                onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })}>
                <option value="DISCOUNT">Discount (deduct)</option>
                <option value="SURCHARGE">Surcharge (add)</option>
                <option value="REPAIR_FEE">Repair Fee (add)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (৳) *</label>
              <input type="number" className="form-input" placeholder="500" min="0" step="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-input" placeholder="Reason for adjustment"
                value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null} Add Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [cashTarget, setCashTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, leasesRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/leases?is_active=true'),
      ]);
      setInvoices(invRes.data);
      setLeases(leasesRes.data);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = invoices.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = (i.tenant_name || '').toLowerCase().includes(q) ||
      (i.unit_number || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatMonth = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';

  const totals = {
    due: invoices.reduce((s, i) => s + Number(i.amount_due || 0), 0),
    paid: invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0),
    outstanding: invoices.filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + Number(i.balance_remaining || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Ledger</h1>
          <p className="page-subtitle">Generate invoices and track payment status</p>
        </div>
        <button className="btn btn-primary" id="generate-invoice-btn" onClick={() => setGenModalOpen(true)}>
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{invoices.length}</div>
            <div className="stat-label">Total Invoices</div>
          </div>
          <div className="stat-icon teal"><Receipt size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">৳{totals.paid.toLocaleString()}</div>
            <div className="stat-label">Total Collected</div>
          </div>
          <div className="stat-icon emerald"><CheckCircle2 size={22} /></div>
        </div>
        <div className="stat-card rose" style={{}}>
          <div className="stat-content">
            <div className="stat-value">৳{totals.outstanding.toLocaleString()}</div>
            <div className="stat-label">Outstanding</div>
          </div>
          <div className="stat-icon rose"><AlertTriangle size={22} /></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{invoices.filter((i) => i.status === 'PENDING_VERIFICATION').length}</div>
            <div className="stat-label">Pending Verify</div>
          </div>
          <div className="stat-icon amber"><Zap size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Invoice Ledger</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 180 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input placeholder="Search tenant or unit…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant / Unit</th>
              <th>Billing Month</th>
              <th>Base Rent</th>
              <th>Utility</th>
              <th>Total Due</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8,9].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <Receipt size={36} className="empty-icon" />
                  <div className="empty-title">No invoices found</div>
                  <div className="empty-desc">Generate invoices for your active leases.</div>
                </div>
              </td></tr>
            ) : filtered.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{inv.tenant_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.unit_number} · {inv.property_name}</div>
                </td>
                <td style={{ fontSize: '0.83rem' }}>{formatMonth(inv.billing_month)}</td>
                <td className="font-mono">৳{Number(inv.base_rent).toLocaleString()}</td>
                <td className="font-mono" style={{ color: inv.utility_charges > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                  {inv.utility_charges > 0 ? `৳${Number(inv.utility_charges).toLocaleString()}` : '—'}
                </td>
                <td className="font-mono font-bold">৳{Number(inv.total_calculated_due || inv.amount_due).toLocaleString()}</td>
                <td className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                  ৳{Number(inv.amount_paid).toLocaleString()}
                </td>
                <td className="font-mono" style={{ color: Number(inv.balance_remaining) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                  ৳{Number(inv.balance_remaining || 0).toLocaleString()}
                </td>
                <td><span className={`badge ${STATUS_BADGE[inv.status] || 'badge-pending'}`}>{inv.status.replace(/_/g, ' ')}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {inv.status !== 'PAID' && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          id={`cash-pay-${inv.id}`}
                          onClick={() => setCashTarget(inv)}
                        >
                          Cash
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          id={`adjust-${inv.id}`}
                          onClick={() => setAdjustTarget(inv)}
                        >
                          Adjust
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GenerateModal
        open={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        leases={leases}
        onGenerated={(inv) => { setInvoices((p) => [inv, ...p]); fetchData(); }}
      />
      <CashPaymentModal
        open={!!cashTarget}
        invoice={cashTarget}
        onClose={() => setCashTarget(null)}
        onPaid={() => fetchData()}
      />
      <AdjustModal
        open={!!adjustTarget}
        invoice={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={() => fetchData()}
      />
    </div>
  );
}
