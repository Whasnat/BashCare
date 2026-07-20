import { useState, useEffect } from 'react';
import { Wrench, Plus, UploadCloud, X } from 'lucide-react';
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

export default function TenantMaintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Requests</h1>
          <p className="page-subtitle">Report and track maintenance issues</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Request
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Issue Type</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Photo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No requests found</td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id}>
                  <td>{formatDate(req.created_at)}</td>
                  <td><span className="badge badge-pending">{req.issue_type}</span></td>
                  <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.title}
                  </td>
                  <td style={{ color: PRIORITY_INFO[req.priority], fontWeight: 600 }}>{req.priority}</td>
                  <td>
                    <span className={`badge ${STATUS_INFO[req.status]?.cls}`}>{STATUS_INFO[req.status]?.label}</span>
                  </td>
                  <td>
                    {req.photo_url ? (
                      <a href={req.photo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-teal)' }}>
                        View Photo
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && <NewRequestModal onClose={() => setModalOpen(false)} onCreated={fetchRequests} />}
    </div>
  );
}

function NewRequestModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    issue_type: 'Plumbing',
    priority: 'LOW',
    title: '',
    description: '',
    photo_url: '' // Base64
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Title is required');
    
    setLoading(true);
    try {
      await api.post('/maintenance', formData);
      toast.success('Maintenance request submitted');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">New Maintenance Request</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Issue Type</label>
            <select 
              className="form-input"
              value={formData.issue_type}
              onChange={e => setFormData({...formData, issue_type: e.target.value})}
            >
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="HVAC">HVAC / AC</option>
              <option value="Appliance">Appliance</option>
              <option value="General">General Maintenance</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Priority</label>
            <select 
              className="form-input"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          <div className="form-group">
            <label>Issue Title</label>
            <input 
              className="form-input" 
              placeholder="e.g. Leaking sink in kitchen"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              className="form-input" 
              placeholder="Describe the problem in detail..."
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Attach Photo (Optional)</label>
            <div 
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 8,
                padding: 20,
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-elevated)'
              }}
            >
              {formData.photo_url ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <img src={formData.photo_url} alt="Preview" style={{ maxHeight: 100, borderRadius: 8 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }} onClick={(e) => { e.stopPropagation(); setFormData({...formData, photo_url: ''}); }}>
                    Remove Photo
                  </span>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <UploadCloud size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Click to upload (Max 2MB)</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
