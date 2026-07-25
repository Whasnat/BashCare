import { useState, useEffect } from 'react';
import { DoorOpen, Plus, Pencil, Trash2, Search, X, Building2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  OCCUPIED: 'badge-occupied',
  VACANT: 'badge-vacant',
  MAINTENANCE: 'badge-maintenance',
};

function UnitModal({ open, onClose, unit, properties, onSaved }) {
  const isEdit = !!unit;
  const [form, setForm] = useState({ property_id: '', unit_number: '', floor: '', bedrooms: 1, status: 'VACANT' });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (unit) {
      setForm({
        property_id: unit.property_id || '',
        unit_number: unit.unit_number || '',
        floor: unit.floor || '',
        bedrooms: unit.bedrooms || 1,
        status: unit.status || 'VACANT',
      });
    } else {
      setForm({ property_id: properties[0]?.id || '', unit_number: '', floor: '', bedrooms: 1, status: 'VACANT' });
    }
    setIsDirty(false);
  }, [unit, open, properties]);

  const setF = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setIsDirty(true); };
  const setFV = (field, val) => { setForm((f) => ({ ...f, [field]: val })); setIsDirty(true); };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.property_id || !form.unit_number) return toast.error('Property and unit number are required');
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.patch(`/units/${unit.id}`, {
          unit_number: form.unit_number,
          floor: form.floor,
          bedrooms: form.bedrooms,
          status: form.status,
        });
        onSaved(data, 'edit');
        toast.success('Unit updated');
      } else {
        const { data } = await api.post('/units', form);
        onSaved(data, 'add');
        toast.success('Unit added');
      }
      setIsDirty(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? t('units.editUnit') : t('units.addUnit')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Property *</label>
                <select
                  className="form-select"
                  value={form.property_id}
                  onChange={setF('property_id')}
                  required
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Unit Number *</label>
                <input
                  className="form-input"
                  placeholder={t('units.phUnitNumber')}
                  value={form.unit_number}
                  onChange={setF('unit_number')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input
                  className="form-input"
                  placeholder={t('units.phFloor')}
                  value={form.floor}
                  onChange={setF('floor')}
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Bedrooms</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={10}
                  value={form.bedrooms}
                  onChange={(e) => setFV('bedrooms', parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={setF('status')}
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
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

export default function Units() {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [unitsRes, propsRes] = await Promise.all([
        api.get('/units'),
        api.get('/properties'),
      ]);
      setUnits(unitsRes.data);
      setProperties(propsRes.data);
    } catch {
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved, mode) => {
    if (mode === 'add') {
      fetchAll(); // re-fetch to get property_name joined
    } else {
      setUnits((u) => u.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
    }
  };

  const handleDelete = async (unit) => {
    if (!window.confirm(`Delete unit ${unit.unit_number}?`)) return;
    try {
      await api.delete(`/units/${unit.id}`);
      setUnits((u) => u.filter((x) => x.id !== unit.id));
      toast.success('Unit deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete occupied unit');
    }
  };

  let filtered = units.filter((u) => {
    const matchSearch = u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      (u.property_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || u.status === filterStatus;
    const matchProp = !filterProperty || u.property_id === filterProperty;
    return matchSearch && matchStatus && matchProp;
  });

  const counts = {
    total: units.length,
    vacant: units.filter((u) => u.status === 'VACANT').length,
    occupied: units.filter((u) => u.status === 'OCCUPIED').length,
    maintenance: units.filter((u) => u.status === 'MAINTENANCE').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('units.title')}</h1>
          <p className="page-subtitle">{t('units.subtitle')}</p>
        </div>
        <button className="btn btn-primary" id="add-unit-btn" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> {t('units.addUnit')}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card teal">
          <div className="stat-content">
            <div className="stat-value">{counts.total}</div>
            <div className="stat-label">{t('units.title')}</div>
          </div>
          <div className="stat-icon teal"><DoorOpen size={22} /></div>
        </div>
        <div className="stat-card emerald">
          <div className="stat-content">
            <div className="stat-value">{counts.occupied}</div>
            <div className="stat-label">{t('units.occupied')}</div>
          </div>
          <div className="stat-icon emerald"><DoorOpen size={22} /></div>
        </div>
        <div className="stat-card amber">
          <div className="stat-content">
            <div className="stat-value">{counts.vacant}</div>
            <div className="stat-label">{t('units.vacant')}</div>
          </div>
          <div className="stat-icon amber"><DoorOpen size={22} /></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-value">{counts.maintenance}</div>
            <div className="stat-label">Maintenance</div>
          </div>
          <div className="stat-icon purple"><DoorOpen size={22} /></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">{t('units.title')}</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 160 }}
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
            >
              <option value="">{t('common.all')} {t('properties.title')}</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 140 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">{t('common.allStatuses')}</option>
              <option value="VACANT">{t('units.vacant')}</option>
              <option value="OCCUPIED">{t('units.occupied')}</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input
                placeholder={t('common.search') + "..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('units.unitNumber')}</th>
              <th>{t('units.property')}</th>
              <th>{t('units.floor')}</th>
              <th>{t('units.bedrooms')}</th>
              <th>{t('units.currentTenant')}</th>
              <th>{t('occupants.rent')} ({t('common.currency')})</th>
              <th>{t('common.status')}</th>
              <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '70%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <DoorOpen size={36} className="empty-icon" />
                  <div className="empty-title">{t('units.noUnits')}</div>
                  <div className="empty-desc">{t('units.noUnitsDesc')}</div>
                </div>
              </td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)'
                    }}>{u.unit_number.slice(0, 3)}</div>
                    <span style={{ fontWeight: 700 }}>{u.unit_number}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={13} />
                    {u.property_name}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.floor || '—'}</td>
                <td>{u.bedrooms} BR</td>
                <td>{u.current_tenant_name ? (
                  <span style={{ fontWeight: 600 }}>{u.current_tenant_name}</span>
                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td className="font-mono">
                  {u.current_rent ? `৳${Number(u.current_rent).toLocaleString()}` : '—'}
                </td>
                <td><span className={`badge ${STATUS_COLORS[u.status]}`}>{u.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      id={`edit-unit-${u.id}`}
                      onClick={() => { setEditing(u); setModalOpen(true); }}
                      title={t('common.edit')}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      id={`delete-unit-${u.id}`}
                      onClick={() => handleDelete(u)}
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

      <UnitModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        unit={editing}
        properties={properties}
        onSaved={handleSaved}
      />
    </div>
  );
}
