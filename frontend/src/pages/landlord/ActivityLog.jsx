import { useState, useEffect } from 'react';
import { Activity, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ENTITY_COLORS = {
  TENANT: 'var(--accent-teal)',
  INVOICE: 'var(--accent-blue)',
  MAINTENANCE: 'var(--accent-amber)',
  PAYMENT: 'var(--accent-emerald)',
  LEASE: 'var(--accent-indigo)'
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/activity-logs', { params: { entity_type: entityFilter } });
      setLogs(data);
    } catch (err) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Track recent activity and system events</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 250 }}>
            <Filter size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <select 
              className="form-input" 
              style={{ paddingLeft: 36 }}
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="TENANT">Tenants</option>
              <option value="LEASE">Leases</option>
              <option value="INVOICE">Invoices</option>
              <option value="PAYMENT">Payments</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Category</th>
              <th>Action</th>
              <th>Description</th>
              <th>Performed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No activity logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(log.created_at)}</td>
                  <td>
                    <span 
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        backgroundColor: `${ENTITY_COLORS[log.entity_type] || 'var(--text-muted)'}22`,
                        color: ENTITY_COLORS[log.entity_type] || 'var(--text-muted)'
                      }}
                    >
                      {log.entity_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.action}</td>
                  <td>{log.description}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.user_name || 'System'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
