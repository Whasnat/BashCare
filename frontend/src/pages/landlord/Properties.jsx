import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, DoorOpen, Search, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function PropertyModal({ open, onClose, property, onSaved }) {
  const isEdit = !!property;
  const [form, setForm] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (property) setForm({ name: property.name, address: property.address });
    else setForm({ name: '', address: '' });
    setIsDirty(false);
  }, [property, open]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return toast.error('Name and address are required');
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.patch(`/properties/${property.id}`, form);
        onSaved(data, 'edit');
        toast.success('Property updated');
      } else {
        const { data } = await api.post('/properties', form);
        onSaved(data, 'add');
        toast.success('Property added');
      }
      setIsDirty(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Property Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Gulshan Heights Tower A"
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Full Address *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="House 12, Road 5, Gulshan-1, Dhaka-1212"
                value={form.address}
                onChange={handleChange('address')}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {isEdit ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, property, onClose, onConfirm }) {
  if (!open || !property) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--accent-rose)' }}>Delete Property?</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{property.name}</strong>?
          This will also remove all units within it.
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/properties');
      setProperties(data);
    } catch {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved, mode) => {
    if (mode === 'add') setProperties((p) => [saved, ...p]);
    else setProperties((p) => p.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/properties/${deleteTarget.id}`);
      setProperties((p) => p.filter((x) => x.id !== deleteTarget.id));
      toast.success('Property deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">Manage all your buildings and complexes</p>
        </div>
        <button className="btn btn-primary" id="add-property-btn" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Stats Row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{properties.length}</div>
            <div className="stat-label">Total Properties</div>
          </div>
          <div className="stat-icon teal"><Building2 size={22} /></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{properties.reduce((s, p) => s + parseInt(p.total_units || 0), 0)}</div>
            <div className="stat-label">Total Units</div>
          </div>
          <div className="stat-icon purple"><DoorOpen size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">{properties.reduce((s, p) => s + parseInt(p.occupied_units || 0), 0)}</div>
            <div className="stat-label">Occupied Units</div>
          </div>
          <div className="stat-icon emerald"><DoorOpen size={22} /></div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">All Properties</h3>
          <div className="search-bar">
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search by name or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Property Name</th>
              <th>Address</th>
              <th>Units</th>
              <th>Occupied</th>
              <th>Vacant</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>
                  {[1,2,3,4,5,6].map((j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <Building2 size={36} className="empty-icon" />
                    <div className="empty-title">{search ? 'No results found' : 'No properties yet'}</div>
                    <div className="empty-desc">
                      {search ? 'Try a different search term.' : 'Click "Add Property" to get started.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', flexShrink: 0
                    }}>🏢</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {p.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                </td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.address}</td>
                <td><strong>{p.total_units || 0}</strong></td>
                <td><span className="badge badge-occupied">{p.occupied_units || 0}</span></td>
                <td><span className="badge badge-vacant">{p.vacant_units || 0}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      id={`edit-property-${p.id}`}
                      onClick={() => { setEditing(p); setModalOpen(true); }}
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      id={`delete-property-${p.id}`}
                      onClick={() => setDeleteTarget(p)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PropertyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        property={editing}
        onSaved={handleSaved}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        property={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
