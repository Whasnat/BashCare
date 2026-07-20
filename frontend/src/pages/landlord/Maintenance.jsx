import { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Search, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_INFO = {
  PENDING: { label: 'Pending', cls: 'badge-pending' },
  IN_PROGRESS: { label: 'In Progress', cls: 'badge-overdue' },
  RESOLVED: { label: 'Resolved', cls: 'badge-paid' },
};

const PRIORITY_INFO = {
  LOW: 'var(--text-muted)',
  MEDIUM: 'var(--accent-amber)',
  HIGH: 'var(--accent-rose)',
  EMERGENCY: 'var(--accent-rose)',
};

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/maintenance')
      .then(({ data }) => setRequests(data))
      .catch(() => toast.error('Failed to load maintenance requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/maintenance/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      setSelectedReq(null);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filtered = requests.filter(req => {
    const matchSearch = !search || 
      (req.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (req.tenant_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (req.unit_number || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || req.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Hub</h1>
          <p className="page-subtitle">Manage tenant maintenance requests and track resolution</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">All Requests</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="tabs">
              <button className={`tab-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
              <button className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>Pending</button>
              <button className={`tab-btn ${filter === 'IN_PROGRESS' ? 'active' : ''}`} onClick={() => setFilter('IN_PROGRESS')}>In Progress</button>
              <button className={`tab-btn ${filter === 'RESOLVED' ? 'active' : ''}`} onClick={() => setFilter('RESOLVED')}>Resolved</button>
            </div>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Property/Unit</th>
              <th>Tenant</th>
              <th>Issue Type</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>No requests found</td></tr>
            ) : (
              filtered.map(req => (
                <tr key={req.id}>
                  <td>{formatDate(req.created_at)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.unit_number}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.property_name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{req.tenant_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.tenant_phone}</div>
                  </td>
                  <td><span className="badge badge-pending">{req.issue_type}</span></td>
                  <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.title}
                  </td>
                  <td style={{ color: PRIORITY_INFO[req.priority], fontWeight: 600 }}>{req.priority}</td>
                  <td>
                    <span className={`badge ${STATUS_INFO[req.status]?.cls}`}>{STATUS_INFO[req.status]?.label}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setSelectedReq(req)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">Request Details</h2>
              <button className="icon-btn" onClick={() => setSelectedReq(null)}>×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{selectedReq.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
                  {selectedReq.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div><strong>Unit:</strong> {selectedReq.unit_number} ({selectedReq.property_name})</div>
                  <div><strong>Tenant:</strong> {selectedReq.tenant_name}</div>
                </div>
              </div>

              {selectedReq.photo_url && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-muted)' }}>Attached Photo</h4>
                  <img 
                    src={selectedReq.photo_url} 
                    alt="Maintenance issue" 
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border-color)' }}
                  />
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-muted)' }}>Update Status</h4>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select 
                    className="form-input" 
                    style={{ maxWidth: 200 }}
                    value={selectedReq.status} 
                    onChange={(e) => setSelectedReq({ ...selectedReq, status: e.target.value })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => updateStatus(selectedReq.id, selectedReq.status)}
                  >
                    Save Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
