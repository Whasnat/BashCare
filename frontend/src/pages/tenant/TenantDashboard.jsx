import { useState, useEffect } from 'react';
import { FileText, Wallet, Home, ArrowUpRight, Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_INFO = {
  PAID: { label: 'Paid', cls: 'badge-paid' },
  UNPAID: { label: 'Unpaid', cls: 'badge-unpaid' },
  OVERDUE: { label: 'Overdue', cls: 'badge-overdue' },
  PENDING_VERIFICATION: { label: 'Pending Review', cls: 'badge-pending' },
  PARTIALLY_PAID: { label: 'Partial', cls: 'badge-partial' },
};

export default function TenantDashboard() {
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/portal/me'),
      api.get('/portal/invoices'),
    ])
      .then(([profileRes, invRes]) => {
        setProfile(profileRes.data);
        setInvoices(invRes.data);
      })
      .catch(() => toast.error('Failed to load your dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-col gap-4">
      <div className="stat-grid">
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
    </div>
  );

  const openInvoices = invoices.filter(i => i.status !== 'PAID');
  const totalOutstanding = openInvoices.reduce((s, i) => s + Number(i.balance_remaining || 0), 0);
  const latestInvoice = invoices[0] || null;
  const { label: latestLabel, cls: latestCls } = STATUS_INFO[latestInvoice?.status] || {};

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatMonth = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">
            Hello, <strong>{profile?.full_name}</strong> — Unit {profile?.unit_number}, {profile?.property_name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">৳{Number(profile?.base_rent || 0).toLocaleString()}</div>
            <div className="stat-label">Monthly Rent</div>
          </div>
          <div className="stat-icon teal"><Home size={22} /></div>
        </div>
        <div className="stat-card rose">
          <div className="stat-content">
            <div className="stat-value">৳{totalOutstanding.toLocaleString()}</div>
            <div className="stat-label">Outstanding Balance ({openInvoices.length} invoices)</div>
          </div>
          <div className="stat-icon rose"><AlertTriangle size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">{invoices.filter(i => i.status === 'PAID').length}</div>
            <div className="stat-label">Paid Invoices</div>
          </div>
          <div className="stat-icon emerald"><CheckCircle2 size={22} /></div>
        </div>
      </div>

      <div className="grid-2">
        {/* Lease Info Card */}
        <div className="card">
          <h3 className="section-title">My Lease</h3>
          {profile?.lease_id ? (
            <div className="flex-col gap-3">
              {[
                { label: 'Property', value: profile.property_name },
                { label: 'Unit', value: profile.unit_number },
                { label: 'Base Rent', value: `৳${Number(profile.base_rent).toLocaleString()}` },
                { label: 'Security Deposit', value: `৳${Number(profile.security_deposit || 0).toLocaleString()}` },
                { label: 'Lease Start', value: formatDate(profile.start_date) },
                { label: 'Lease End', value: profile.end_date ? formatDate(profile.end_date) : 'Open-ended' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-title">No active lease</div>
              <div className="empty-desc">Contact your landlord to set up your lease.</div>
            </div>
          )}
        </div>

        {/* Latest Invoice */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Latest Invoice</h3>
            <Link to="/portal/invoices" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {latestInvoice ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMonth(latestInvoice.billing_month)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Due: {formatDate(latestInvoice.due_date)}
                  </div>
                </div>
                <span className={`badge ${latestCls}`}>{latestLabel}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Base Rent', value: `৳${Number(latestInvoice.base_rent).toLocaleString()}` },
                  { label: 'Utilities', value: latestInvoice.utility_charges > 0 ? `৳${Number(latestInvoice.utility_charges).toLocaleString()}` : '—' },
                  { label: 'Total Due', value: `৳${Number(latestInvoice.total_calculated_due || latestInvoice.amount_due).toLocaleString()}`, bold: true },
                  { label: 'Balance', value: `৳${Number(latestInvoice.balance_remaining || 0).toLocaleString()}`, red: Number(latestInvoice.balance_remaining) > 0 },
                ].map(({ label, value, bold, red }) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: bold ? 800 : 600, color: red ? 'var(--accent-rose)' : 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</div>
                  </div>
                ))}
              </div>
              {latestInvoice.status !== 'PAID' && (
                <Link
                  to={`/portal/invoices/${latestInvoice.id}`}
                  className="btn btn-primary w-full justify-center"
                >
                  <Wallet size={15} /> Pay This Invoice
                </Link>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-title">No invoices yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      {profile?.mfs_personal_number && (
        <div className="card" style={{ marginTop: 20, borderColor: 'rgba(20,184,166,0.2)' }}>
          <h3 className="section-title">Payment Instructions</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Send rent to your landlord's personal MFS number, then submit your Transaction ID on the invoice page.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'bKash / Nagad / Rocket', value: profile.mfs_personal_number },
              profile.bank_account_number && { label: `${profile.bank_name || 'Bank'} A/C`, value: profile.bank_account_number },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 10, padding: '10px 16px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '1rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
