import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Pencil, Trash2, DoorOpen, Search, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';
import useAuthStore from '../../store/authStore';

function PropertyModal({ open, onClose, property, onSaved }) {
  const isEdit = !!property;
  const [form, setForm] = useState({ name: '', address: '', property_type: 'RESIDENTIAL' });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (property) setForm({ name: property.name, address: property.address, property_type: property.property_type || 'RESIDENTIAL' });
    else setForm({ name: '', address: '', property_type: 'RESIDENTIAL' });
    setIsDirty(false);
  }, [property, open]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty && !window.confirm(t('common.confirmLogout'))) return; // using confirmLogout as generic unsaved changes or I can add a specific one later. Wait, better to just use english string for confirm for now or add common.unsaved. Let's just keep english for window.confirm since it's a native alert, or use t('common.cancel').
    // Let's use English for the native alert for now to keep it simple, or add a translation if needed.
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
          <h2 className="modal-title">{isEdit ? t('properties.editProperty') : t('properties.addProperty')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Property Type *</label>
              <select
                className="form-input"
                value={form.property_type}
                onChange={handleChange('property_type')}
                required
              >
                <option value="RESIDENTIAL">Residential</option>
                <option value="HOTEL">Hotel</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="COMMERCIAL">Commercial Plaza</option>
                <option value="COWORKING">Co-working Space</option>
                <option value="WAREHOUSE">Warehouse</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('properties.propertyName')} *</label>
              <input
                className="form-input"
                placeholder={t('properties.phPropertyName')}
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('properties.address')} *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={t('properties.phAddress')}
                value={form.address}
                onChange={handleChange('address')}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={15} />}
            {isEdit ? t('common.save') : t('common.create')}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, property, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  if (!open || !property) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--accent-rose)' }}>{t('common.delete')}?</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t('properties.deleteConfirm')} <strong style={{ color: 'var(--text-primary)' }}>{property.name}</strong>?
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={deleting}>{t('common.cancel')}</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : <Trash2 size={15} />}
            {t('common.delete')}
          </button>
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
  const { t } = useTranslation();

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
    if (mode === 'add') {
      setProperties((p) => [saved, ...p]);
      const { onboarding, advanceOnboarding } = useAuthStore.getState();
      if (onboarding?.isActive && onboarding?.step === 2) {
        advanceOnboarding();
      }
    }
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
          <h1 className="page-title">{t('properties.title')}</h1>
          <p className="page-subtitle">{t('properties.subtitle')}</p>
        </div>
        <button className="btn btn-primary" id="add-property-btn" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> {t('properties.addProperty')}
        </button>
      </div>

      {/* Stats Row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{properties.length}</div>
            <div className="stat-label">{t('properties.title')}</div>
          </div>
          <div className="stat-icon teal"><Building2 size={22} /></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{properties.reduce((s, p) => s + parseInt(p.total_units || 0), 0)}</div>
            <div className="stat-label">{t('properties.totalUnits')}</div>
          </div>
          <div className="stat-icon purple"><DoorOpen size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">{properties.reduce((s, p) => s + parseInt(p.occupied_units || 0), 0)}</div>
            <div className="stat-label">{t('properties.occupancy')}</div>
          </div>
          <div className="stat-icon emerald"><DoorOpen size={22} /></div>
        </div>
      </div>

      {/* Table */}
      {properties.length === 0 && !loading && !search ? (
        <EmptyState 
          icon={Building2}
          title="No properties yet"
          message="Add your first property to start managing units and occupants."
          actionLabel="Add Property"
          onAction={() => { setEditing(null); setModalOpen(true); }}
        />
      ) : (
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">{t('properties.title')}</h3>
          <div className="search-bar">
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder={t('common.search') + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('properties.propertyName')}</th>
              <th>Type</th>
              <th>{t('properties.address')}</th>
              <th>{t('properties.totalUnits')}</th>
              <th>{t('units.occupied')}</th>
              <th>{t('units.vacant')}</th>
              <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
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
                    <div className="empty-title">{search ? t('common.noResults') : t('properties.noProperties')}</div>
                    <div className="empty-desc">
                      {search ? '' : t('properties.noPropertiesDesc')}
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
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--accent-primary)' }}>Code: {p.property_code}</strong>
                      </div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-outline">{p.property_type || 'RESIDENTIAL'}</span></td>
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
                      title={t('common.edit')}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      id={`delete-property-${p.id}`}
                      onClick={() => setDeleteTarget(p)}
                      title={t('common.delete')}
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
      )}

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
