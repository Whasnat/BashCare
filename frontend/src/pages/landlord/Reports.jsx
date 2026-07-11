import { useState, useEffect } from 'react';
import { PieChart as PieIcon, TrendingUp, Building2, Users, Wallet, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f43f5e', '#10b981'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem'
    }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.72rem' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: ৳{Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/overview')
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-col gap-4">
      <div className="stat-grid">
        {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
    </div>
  );

  const { occupancy, revenue_monthly = [], payment_methods = [], overdue, recent_activity = [] } = data || {};

  // Format revenue data for chart
  const revenueChart = revenue_monthly.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    'Amount Due': Number(r.total_due),
    'Collected': Number(r.total_collected),
  }));

  // Format payment methods for pie
  const pieData = payment_methods.map((m) => ({
    name: m.method.replace(/_/g, ' '),
    value: Number(m.total),
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Financial performance and occupancy insights</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{occupancy?.occupancy_rate || 0}%</div>
            <div className="stat-label">Occupancy Rate</div>
          </div>
          <div className="stat-icon teal"><Building2 size={22} /></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{occupancy?.occupied || 0} / {occupancy?.total_units || 0}</div>
            <div className="stat-label">Units Occupied</div>
          </div>
          <div className="stat-icon purple"><PieIcon size={22} /></div>
        </div>
        <div className="stat-card rose">
          <div className="stat-content">
            <div className="stat-value">৳{Number(overdue?.total_outstanding || 0).toLocaleString()}</div>
            <div className="stat-label">Outstanding ({overdue?.count || 0} invoices)</div>
          </div>
          <div className="stat-icon rose"><TrendingUp size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">
              ৳{revenue_monthly.length > 0
                ? Number(revenue_monthly[revenue_monthly.length - 1]?.total_collected || 0).toLocaleString()
                : '0'}
            </div>
            <div className="stat-label">This Month Collected</div>
          </div>
          <div className="stat-icon emerald"><Wallet size={22} /></div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
            6-Month Revenue vs Collection
          </div>
        </div>
        {revenueChart.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <BarChart3 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div className="empty-title">No revenue data yet</div>
            <div className="empty-desc">Generate invoices and collect payments to see charts.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="Amount Due" stroke="#6366f1" fill="url(#colorDue)" strokeWidth={2} />
              <Area type="monotone" dataKey="Collected" stroke="#14b8a6" fill="url(#colorCollected)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid-2">
        {/* Payment Methods Pie */}
        <div className="chart-card">
          <div className="chart-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} style={{ color: 'var(--accent-primary)' }} />
              Payment Method Breakdown
            </div>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="empty-title">No payment data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Occupancy Breakdown */}
        <div className="chart-card">
          <div className="chart-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
              Occupancy Breakdown
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {[
              { label: 'Occupied', value: occupancy?.occupied || 0, color: 'var(--accent-primary)', bg: 'rgba(20,184,166,0.1)' },
              { label: 'Vacant', value: occupancy?.vacant || 0, color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Maintenance', value: occupancy?.maintenance || 0, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)' },
            ].map(({ label, value, color, bg }) => {
              const pct = occupancy?.total_units > 0 ? (value / occupancy.total_units * 100).toFixed(0) : 0;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{value} units ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'var(--bg-elevated)', borderRadius: 10,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--accent-primary)' }}>
              {occupancy?.occupancy_rate || 0}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall Occupancy Rate</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Recent Transactions</h3>
        {recent_activity.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-title">No transactions recorded yet</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property / Unit</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_activity.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{t.tenant_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {t.property_name} · {t.unit_number}
                    </td>
                    <td className="font-mono font-bold">৳{Number(t.amount).toLocaleString()}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-secondary)' }}>
                        {t.method?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status?.toLowerCase()}`}>{t.status}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
