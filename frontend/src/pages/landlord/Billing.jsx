import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Plus, Search, X, ChevronDown, Zap, CheckCircle2, AlertTriangle, RefreshCw, Download, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import InvoicePDF from '../../components/InvoicePDF';
import useAuthStore from '../../store/authStore';

const STATUS_BADGE = {
  PAID: 'badge-paid',
  UNPAID: 'badge-unpaid',
  OVERDUE: 'badge-overdue',
  PENDING_VERIFICATION: 'badge-pending',
  PARTIALLY_PAID: 'badge-partial',
};

function GenerateModal({ open, onClose, leases, onGenerated }) {
  const { t } = useTranslation();
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
          <h2 className="modal-title">{t('billing.modalGenerateInvoice')}</h2>
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
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {t('billing.generateInvoice')}
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
  const { t } = useTranslation();

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
          <h2 className="modal-title">{t('billing.modalRecordCashPayment')}</h2>
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
                placeholder={t('billing.phReceivedInPerson')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={15} />}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({ open, invoice, onClose, onAdjusted }) {
  const { t } = useTranslation();
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
          <h2 className="modal-title">{t('billing.modalAddAdjustment')}</h2>
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
              <input type="number" className="form-input" placeholder={t('billing.phAmount')} min="0" step="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('billing.reasonForAdjustment')}</label>
              <input className="form-input" placeholder={t('billing.phReasonForAdjustment')}
                value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={15} />} {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Billing() {
  const [leases, setLeases] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [cashTarget, setCashTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [markingOverdue, setMarkingOverdue] = useState(false);

  const { user } = useAuthStore();
  const pdfRef = useRef(null);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const { t } = useTranslation();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus]);

  const { data: response, isLoading: loading, refetch } = useQuery({
    queryKey: ['invoices', page, debouncedSearch, filterStatus],
    queryFn: async () => {
      const { data } = await api.get('/invoices', {
        params: { page, limit, search: debouncedSearch, status: filterStatus }
      });
      return data;
    },
    keepPreviousData: true,
  });

  const invoices = response?.data || [];
  const meta = response?.meta || { total: 0, totalPages: 1 };

  const fetchLeases = useCallback(async () => {
    try {
      const { data } = await api.get('/agreements?is_active=true');
      setLeases(data.data || data); // handle paginated and non-paginated responses
    } catch {
      toast.error('Failed to load leases');
    }
  }, []);

  useEffect(() => { fetchLeases(); }, [fetchLeases]);

  useEffect(() => {
    if (pdfInvoice && pdfRef.current) {
      const opt = {
        margin:       0,
        filename:     `Invoice-INV${String(pdfInvoice.id).padStart(6, '0')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const toastId = toast.loading('Generating PDF...');
      html2pdf().set(opt).from(pdfRef.current).save().then(() => {
        toast.success('Invoice downloaded', { id: toastId });
        setPdfInvoice(null);
      }).catch((err) => {
        toast.error('Failed to generate PDF', { id: toastId });
        setPdfInvoice(null);
      });
    }
  }, [pdfInvoice]);

  const handleGenerateAll = async () => {
    if (!window.confirm('Generate invoices for ALL active leases for the current month?')) return;
    setGeneratingAll(true);
    try {
      const { data } = await api.post('/invoices/generate-all');
      toast.success(data.message);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate invoices');
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleMarkOverdue = async () => {
    setMarkingOverdue(true);
    try {
      const { data } = await api.post('/invoices/mark-overdue');
      if (data.updated > 0) {
        toast.success(`${data.updated} invoice(s) marked as Overdue`);
        refetch();
      } else {
        toast('No overdue invoices found', { icon: '✅' });
      }
    } catch (err) {
      toast.error('Failed to mark overdue invoices');
    } finally {
      setMarkingOverdue(false);
    }
  };

  const handleWaiveLateFee = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to waive the late fee for this invoice?')) return;
    try {
      await api.post(`/invoices/${invoiceId}/waive-late-fee`);
      toast.success('Late fee waived successfully');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to waive late fee');
    }
  };

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
          <h1 className="page-title">{t('billing.title')}</h1>
          <p className="page-subtitle">{t('billing.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" id="mark-overdue-btn" onClick={handleMarkOverdue} disabled={markingOverdue} title="Mark all unpaid past-due invoices as Overdue">
            {markingOverdue ? <span className="spinner" /> : <AlertTriangle size={15} />}
            {t('billing.markOverdue')}
          </button>
          <button className="btn btn-secondary" id="generate-all-btn" onClick={handleGenerateAll} disabled={generatingAll}>
            {generatingAll ? <span className="spinner" /> : <RefreshCw size={15} />}
            {t('billing.generateAll')}
          </button>
          <button className="btn btn-primary" id="generate-invoice-btn" onClick={() => setGenModalOpen(true)}>
            <Plus size={16} /> {t('billing.generateInvoice')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{meta.total}</div>
            <div className="stat-label">{t('billing.totalInvoices')}</div>
          </div>
          <div className="stat-icon teal"><Receipt size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">৳ {totals.paid.toLocaleString()}</div>
            <div className="stat-label">{t('billing.totalCollected')}</div>
          </div>
          <div className="stat-icon emerald"><CheckCircle2 size={22} /></div>
        </div>
        <div className="stat-card rose" style={{}}>
          <div className="stat-content">
            <div className="stat-value">৳ {totals.outstanding.toLocaleString()}</div>
            <div className="stat-label">{t('billing.outstanding')}</div>
          </div>
          <div className="stat-icon rose"><AlertTriangle size={22} /></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{invoices.filter((i) => i.status === 'PENDING_VERIFICATION').length}</div>
            <div className="stat-label">{t('billing.pendingVerify')}</div>
          </div>
          <div className="stat-icon amber"><Zap size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">{t('billing.invoiceLedger')}</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 180 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">{t('billing.allStatuses')}</option>
              <option value="UNPAID">{t('billing.unpaid')}</option>
              <option value="PENDING_VERIFICATION">{t('billing.pendingVerification')}</option>
              <option value="PARTIALLY_PAID">{t('billing.partiallyPaid')}</option>
              <option value="PAID">{t('common.paid', 'Paid')}</option>
              <option value="OVERDUE">{t('billing.overdue')}</option>
            </select>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input placeholder={t('billing.searchPlaceholder')} value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t('billing.tenantUnit')}</th>
              <th>{t('billing.billingMonth')}</th>
              <th>{t('billing.baseRent')}</th>
              <th>{t('billing.utility')}</th>
              <th>{t('billing.totalDue')}</th>
              <th>{t('billing.paid')}</th>
              <th>{t('billing.balance')}</th>
              <th>{t('common.status')}</th>
              <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8,9].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <Receipt size={36} className="empty-icon" />
                  <div className="empty-title">{t('billing.noInvoices')}</div>
                  <div className="empty-desc">{t('billing.noInvoicesDesc')}</div>
                </div>
              </td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{inv.tenant_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.unit_number} · {inv.property_name}</div>
                </td>
                <td style={{ fontSize: '0.83rem' }}>{formatMonth(inv.billing_month)}</td>
                <td className="font-mono">৳ {Number(inv.base_rent).toLocaleString()}</td>
                <td className="font-mono" style={{ color: inv.utility_charges > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                  {inv.utility_charges > 0 ? `৳ ${Number(inv.utility_charges).toLocaleString()}` : '—'}
                </td>
                <td className="font-mono font-bold">৳ {Number(inv.total_calculated_due || inv.amount_due).toLocaleString()}</td>
                <td className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                  ৳ {Number(inv.amount_paid).toLocaleString()}
                </td>
                <td className="font-mono" style={{ color: Number(inv.balance_remaining) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                  ৳ {Number(inv.balance_remaining || 0).toLocaleString()}
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
                          {t('billing.cash')}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          id={`adjust-${inv.id}`}
                          onClick={() => setAdjustTarget(inv)}
                        >
                          {t('billing.adjust')}
                        </button>
                        {Number(inv.late_fees) > 0 && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-amber)' }}
                            onClick={() => handleWaiveLateFee(inv.id)}
                            title="Waive Late Fee"
                          >
                            Waive Late Fee
                          </button>
                        )}
                      </>
                    )}
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Download PDF"
                      onClick={() => setPdfInvoice(inv)}
                    >
                      <Download size={15} />
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
              {t('common.showing')} {invoices.length} {t('common.of')} {meta.total} {t('dashboard.invoices')}
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

      <GenerateModal
        open={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        leases={leases}
        onGenerated={() => refetch()}
      />
      <CashPaymentModal
        open={!!cashTarget}
        invoice={cashTarget}
        onClose={() => setCashTarget(null)}
        onPaid={() => refetch()}
      />
      <AdjustModal
        open={!!adjustTarget}
        invoice={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={() => refetch()}
      />
      
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <InvoicePDF ref={pdfRef} invoice={pdfInvoice} landlord={user} />
      </div>
    </div>
  );
}
