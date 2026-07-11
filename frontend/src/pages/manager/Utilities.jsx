import { useState, useEffect } from 'react';
import { Zap, Plus, X, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function MeterLogModal({ open, onClose, units, onLogged }) {
  const [form, setForm] = useState({
    unit_id: '', lease_id: '', meter_type: 'ELECTRICITY',
    meter_reading: '', reading_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [occupiedUnits, setOccupiedUnits] = useState([]);

  useEffect(() => {
    if (open) {
      const occ = units.filter((u) => u.status === 'OCCUPIED' && u.lease_id);
      setOccupiedUnits(occ);
      setForm({
        unit_id: '', lease_id: '', meter_type: 'ELECTRICITY',
        meter_reading: '', reading_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, units]);

  const handleUnitChange = (unitId) => {
    const unit = occupiedUnits.find((u) => u.id === unitId);
    setForm({ ...form, unit_id: unitId, lease_id: unit?.lease_id || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.unit_id || !form.lease_id || !form.meter_reading) {
      return toast.error('Unit, reading value, and date are required');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/utilities/log', form);
      toast.success(
        `Meter logged. Delta: ${data.calculated_units || 0} units. Charge: ৳${data.charge_amount || 0}`
      );
      onLogged(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log meter reading');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Log Meter Reading</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Occupied Unit *</label>
              <select
                className="form-select"
                value={form.unit_id}
                onChange={(e) => handleUnitChange(e.target.value)}
                required
              >
                <option value="">Select a unit…</option>
                {occupiedUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number} — {u.property_name} ({u.current_tenant_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Meter Type</label>
                <select
                  className="form-select"
                  value={form.meter_type}
                  onChange={(e) => setForm({ ...form, meter_type: e.target.value })}
                >
                  <option value="ELECTRICITY">⚡ Electricity</option>
                  <option value="GAS">🔥 Gas</option>
                  <option value="WATER">💧 Water</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reading Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.reading_date}
                  onChange={(e) => setForm({ ...form, reading_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Current Meter Reading *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1547.80"
                value={form.meter_reading}
                onChange={(e) => setForm({ ...form, meter_reading: e.target.value })}
                min="0"
                step="0.01"
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Delta will be auto-calculated vs previous reading. Charge is tariff × delta.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Log Reading
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Utilities() {
  const [logs, setLogs] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [logsRes, unitsRes] = await Promise.all([
        api.get('/utilities'),
        api.get('/units'),
      ]);
      setLogs(logsRes.data);
      setUnits(unitsRes.data);
    } catch {
      toast.error('Failed to load utilities data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (l.unit_number || '').toLowerCase().includes(q) ||
      (l.property_name || '').toLowerCase().includes(q);
  });

  const METER_ICONS = { ELECTRICITY: '⚡', GAS: '🔥', WATER: '💧' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Utility Meter Logs</h1>
          <p className="page-subtitle">Log meter readings — delta auto-calculated and applied to invoices</p>
        </div>
        <button className="btn btn-primary" id="log-meter-btn" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Log Reading
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">All Meter Readings</h3>
          <div className="search-bar">
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search by unit or property…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Meter Type</th>
              <th>Reading</th>
              <th>Delta (units)</th>
              <th>Charge (৳)</th>
              <th>Date</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map((i) => (
                <tr key={i}>{[1,2,3,4,5,6,7].map((j) => (
                  <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Zap size={36} className="empty-icon" />
                  <div className="empty-title">No meter logs yet</div>
                  <div className="empty-desc">Log meter readings to auto-calculate utility charges on invoices.</div>
                </div>
              </td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{l.unit_number}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.property_name}</div>
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', gap: 5 }}>
                    {METER_ICONS[l.meter_type]} {l.meter_type}
                  </span>
                </td>
                <td className="font-mono font-bold">{Number(l.meter_reading).toFixed(2)}</td>
                <td className="font-mono" style={{ color: 'var(--accent-amber)' }}>
                  {l.calculated_units != null ? `+${Number(l.calculated_units).toFixed(2)}` : '—'}
                </td>
                <td className="font-mono" style={{ color: l.charge_amount > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                  {l.charge_amount != null ? `৳${Number(l.charge_amount).toFixed(2)}` : '—'}
                </td>
                <td style={{ fontSize: '0.83rem' }}>
                  {new Date(l.reading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {l.logged_by_name || 'System'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MeterLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        units={units}
        onLogged={(log) => {
          setLogs((prev) => [log, ...prev]);
        }}
      />
    </div>
  );
}
