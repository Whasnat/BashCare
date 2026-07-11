import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_INFO = {
  PAID: { label: 'Paid', cls: 'badge-paid', icon: CheckCircle2 },
  UNPAID: { label: 'Unpaid', cls: 'badge-unpaid', icon: AlertTriangle },
  OVERDUE: { label: 'Overdue', cls: 'badge-overdue', icon: AlertTriangle },
  PENDING_VERIFICATION: { label: 'Pending Review', cls: 'badge-pending', icon: Clock },
  PARTIALLY_PAID: { label: 'Partially Paid', cls: 'badge-partial', icon: Clock },
};

function SubmitTrxModal({ open, invoice, onClose, onSubmitted }) {
  const [form, setForm] = useState({ amount: '', method: 'BKASH', trx_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm(f => ({ ...f, amount: invoice.balance_remaining || invoice.amount_due || '' }));
    }
  }, [invoice, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.trx_id.trim()) return toast.error('Transaction ID is required');
    setSaving(true);
    try {
      await api.post(`/portal/invoices/${invoice.id}/pay`, {
        ...form,
        amount: parseFloat(form.amount),
      });
      toast.success('Payment submitted! Your landlord will verify and clear your invoice shortly.');
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit payment');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !invoice) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Submit Payment</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Payment info banner — show per-provider numbers */}
        {(invoice.bkash_personal_number || invoice.nagad_personal_number || invoice.rocket_personal_number || invoice.bank_account_number) && (
          <div style={{
            background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Send payment to your landlord
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invoice.bkash_personal_number && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 60, fontSize: '0.75rem', color: '#e9076c', fontWeight: 700 }}>bKash</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>{invoice.bkash_personal_number}</code>
                </div>
              )}
              {invoice.nagad_personal_number && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 60, fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 700 }}>Nagad</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>{invoice.nagad_personal_number}</code>
                </div>
              )}
              {invoice.rocket_personal_number && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 60, fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>Rocket</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>{invoice.rocket_personal_number}</code>
                </div>
              )}
              {invoice.bank_account_number && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 60, fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 700 }}>Bank</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>{invoice.bank_account_number} · {invoice.bank_name}</code>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
              ① Use <strong>Send Money</strong> (not payment) in your app → ② Come back here → ③ Enter the Transaction ID below
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={form.method}
                onChange={e => setForm({ ...form, method: e.target.value })}
              >
                <option value="BKASH">bKash (Send Money)</option>
                <option value="NAGAD">Nagad (Send Money)</option>
                <option value="ROCKET">Rocket (Send Money)</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount Sent (৳) *</label>
              <input
                type="number"
                className="form-input"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                min="1"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Transaction ID (TrxID) *</label>
              <input
                className="form-input"
                placeholder="e.g. 8N5ABCDE12"
                value={form.trx_id}
                onChange={e => setForm({ ...form, trx_id: e.target.value.toUpperCase() })}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Found in your payment app under Transaction History
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Sent for July rent"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Wallet size={15} />}
              Submit for Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenantInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const fetchInvoice = () => {
    setLoading(true);
    api.get(`/portal/invoices/${id}`)
      .then(({ data }) => setInvoice(data))
      .catch(() => toast.error('Invoice not found or access denied'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatMonth = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';

  if (loading) return (
    <div className="flex-col gap-4">
      <div className="skeleton" style={{ height: 28, width: 200, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
    </div>
  );

  if (!invoice) return (
    <div className="empty-state">
      <AlertTriangle size={36} className="empty-icon" />
      <div className="empty-title">Invoice not found</div>
      <Link to="/portal/invoices" className="btn btn-ghost" style={{ marginTop: 12 }}>
        <ArrowLeft size={15} /> Back to Invoices
      </Link>
    </div>
  );

  const { label, cls } = STATUS_INFO[invoice.status] || { label: invoice.status, cls: 'badge-pending' };
  const canPay = !['PAID'].includes(invoice.status);
  const balance = Number(invoice.balance_remaining || 0);
  const totalDue = Number(invoice.total_calculated_due || invoice.amount_due || 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/portal/invoices" className="btn btn-ghost btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              Invoice — {formatMonth(invoice.billing_month)}
            </h1>
            <p className="page-subtitle">{invoice.unit_number} · {invoice.property_name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`badge ${cls}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>{label}</span>
          {canPay && (
            <button
              className="btn btn-primary"
              id="submit-payment-btn"
              onClick={() => setPayModalOpen(true)}
            >
              <Wallet size={15} /> Submit Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Invoice Breakdown */}
        <div className="card">
          <h3 className="section-title">Invoice Breakdown</h3>
          <div className="flex-col gap-0">
            {[
              { label: 'Base Rent', value: `৳${Number(invoice.base_rent).toLocaleString()}` },
              { label: 'Utility Charges', value: Number(invoice.utility_charges) > 0 ? `৳${Number(invoice.utility_charges).toLocaleString()}` : '—', muted: !invoice.utility_charges },
              { label: 'Late Fees', value: Number(invoice.late_fees) > 0 ? `৳${Number(invoice.late_fees).toLocaleString()}` : '—', muted: !invoice.late_fees },
              { label: 'Adjustments', value: Number(invoice.total_adjustments) !== 0 ? `৳${Number(invoice.total_adjustments).toLocaleString()}` : '—', muted: !invoice.total_adjustments },
            ].map(({ label, value, muted }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
                fontSize: '0.88rem',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', color: muted ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            {/* Total row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '14px 0', fontSize: '1rem', fontWeight: 800,
            }}>
              <span>Total Due</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>৳{totalDue.toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10, marginTop: 4,
              background: balance > 0 ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${balance > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}`,
            }}>
              <span style={{ fontWeight: 700, color: balance > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {balance > 0 ? 'Balance Remaining' : 'Paid in Full ✓'}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: balance > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                ৳{balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="card">
          <h3 className="section-title">Details</h3>
          <div className="flex-col gap-0">
            {[
              { label: 'Billing Month', value: formatMonth(invoice.billing_month) },
              { label: 'Due Date', value: formatDate(invoice.due_date) },
              { label: 'Amount Paid', value: `৳${Number(invoice.amount_paid).toLocaleString()}` },
              { label: 'Property', value: invoice.property_name },
              { label: 'Unit', value: invoice.unit_number },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Adjustments list */}
          {invoice.adjustments?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Adjustments
              </div>
              {invoice.adjustments.map(adj => (
                <div key={adj.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: 8, marginBottom: 4,
                  background: 'var(--bg-elevated)', fontSize: '0.82rem',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {adj.adjustment_type.replace(/_/g, ' ')} {adj.note ? `— ${adj.note}` : ''}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: Number(adj.amount) < 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {Number(adj.amount) < 0 ? '-' : '+'}৳{Math.abs(Number(adj.amount)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Payment History</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Amount</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-secondary)' }}>
                      {p.method?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-mono font-bold" style={{ color: 'var(--accent-emerald)' }}>
                    ৳{Number(p.amount).toLocaleString()}
                  </td>
                  <td>
                    <code style={{
                      background: 'var(--bg-elevated)', padding: '2px 8px',
                      borderRadius: 6, fontSize: '0.78rem', fontFamily: 'monospace',
                      color: 'var(--accent-primary)', border: '1px solid var(--border)',
                    }}>
                      {p.trx_id || '—'}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${p.status === 'VERIFIED' ? 'badge-paid' : p.status === 'REJECTED' ? 'badge-overdue' : 'badge-pending'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SubmitTrxModal
        open={payModalOpen}
        invoice={invoice}
        onClose={() => setPayModalOpen(false)}
        onSubmitted={fetchInvoice}
      />
    </div>
  );
}
