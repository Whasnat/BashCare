import { useState, useEffect } from 'react';
import { Building2, DoorOpen, Users, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/reports/overview');
      setData(data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-col gap-6 w-full h-full p-4">
        <div className="skeleton h-12 w-1/3 mb-4"></div>
        <div className="grid-3">
          <div className="skeleton h-32 w-full"></div>
          <div className="skeleton h-32 w-full"></div>
          <div className="skeleton h-32 w-full"></div>
        </div>
      </div>
    );
  }

  const { occupancy, overdue, recent_activity } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stat-grid">
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{occupancy?.occupancy_rate || 0}%</div>
            <div className="stat-label">{t('dashboard.occupancyRate')}</div>
            <div className="stat-change up"><ArrowUpRight size={12} className="inline mr-1"/>+2.4%</div>
          </div>
          <div className="stat-icon teal"><DoorOpen size={24} /></div>
        </div>
        
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{occupancy?.occupied || 0} / {occupancy?.total_units || 0}</div>
            <div className="stat-label">{t('dashboard.occupiedUnits')}</div>
          </div>
          <div className="stat-icon purple"><Building2 size={24} /></div>
        </div>

        <div className="stat-card rose">
          <div className="stat-content">
            <div className="stat-value">৳{Number(overdue?.total_outstanding || 0).toLocaleString()}</div>
            <div className="stat-label">{t('dashboard.overdueOutstanding')} ({overdue?.count || 0} {t('dashboard.invoices')})</div>
            <div className="stat-change down"><ArrowDownRight size={12} className="inline mr-1"/>{t('dashboard.actionNeeded')}</div>
          </div>
          <div className="stat-icon rose"><Receipt size={24} /></div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Transactions Table */}
        <div className="card">
          <h3 className="section-title">{t('dashboard.recentTransactions')}</h3>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dashboard.tenant')}</th>
                  <th>{t('dashboard.amount')}</th>
                  <th>{t('dashboard.method')}</th>
                  <th>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {recent_activity?.length > 0 ? recent_activity.map((trx, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="font-bold">{trx.tenant_name}</div>
                      <div className="text-xs text-muted">{t('dashboard.unit')} {trx.unit_number}</div>
                    </td>
                    <td className="font-mono font-bold">৳{Number(trx.amount).toLocaleString()}</td>
                    <td>
                      <span className="badge" style={{background: 'rgba(255,255,255,0.05)'}}>
                        {trx.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${trx.status.toLowerCase()}`}>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-8">{t('dashboard.noRecentTransactions')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Notices */}
        <div className="card">
          <h3 className="section-title">{t('dashboard.quickActions')}</h3>
          <div className="flex-col gap-3">
            <button className="btn btn-secondary justify-start py-3" onClick={() => navigate('/occupants')}>
              <Users size={16} className="text-accent" /> {t('dashboard.registerNewTenant')}
            </button>
            <button className="btn btn-secondary justify-start py-3" onClick={() => navigate('/billing')}>
              <Receipt size={16} className="text-emerald" /> {t('dashboard.generateMonthlyInvoices')}
            </button>
            <button className="btn btn-secondary justify-start py-3" onClick={() => navigate('/properties')}>
              <Building2 size={16} className="text-amber" /> {t('dashboard.addNewProperty')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
