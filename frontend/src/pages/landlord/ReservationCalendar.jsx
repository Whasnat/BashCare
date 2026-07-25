import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle, LogOut, Search, Plus, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

function BookingModal({ open, onClose, units, guests, onSaved }) {
  const [form, setForm] = useState({ unit_id: '', occupant_id: '', check_in: '', check_out: '' });
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      setForm({ unit_id: '', occupant_id: '', check_in: '', check_out: '' });
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.unit_id || !form.occupant_id || !form.check_in || !form.check_out) {
      return toast.error('Please fill all required fields');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/reservations', form);
      onSaved(data);
      toast.success('Reservation created');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Reservation</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Guest *</label>
              <select className="form-input" value={form.occupant_id} onChange={(e) => setForm({ ...form, occupant_id: e.target.value })} required>
                <option value="">Select Guest...</option>
                {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Room *</label>
              <select className="form-input" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} required>
                <option value="">Select Room...</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.unit_number} (৳{u.rate_per_unit || 0}/day)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Check-in Date *</label>
              <input type="date" className="form-input" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out Date *</label>
              <input type="date" className="form-input" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={15} />}
              {t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReservationCalendar() {
  const [reservations, setReservations] = useState([]);
  const [units, setUnits] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, unitsRes, guestsRes] = await Promise.all([
        api.get('/reservations'),
        api.get('/units'),
        api.get('/occupants')
      ]);
      setReservations(resRes.data);
      setUnits(unitsRes.data?.data || unitsRes.data);
      setGuests(guestsRes.data?.data || guestsRes.data);
    } catch (err) {
      toast.error('Failed to load reservation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const { data } = await api.post(`/reservations/${id}/${action}`);
      toast.success(data.message || `Action ${action} completed`);
      if (data.invoice) {
        toast.success(`Invoice generated for ৳${data.invoice.amount_due}`);
      }
      fetchData(); // Reload data
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action}`);
    }
  };

  const getStatusBadge = (r) => {
    if (!r.is_active) return <span className="badge badge-vacant">CHECKED_OUT</span>;
    const now = new Date();
    const checkin = new Date(r.check_in);
    if (now >= checkin) return <span className="badge badge-occupied">CHECKED_IN</span>;
    return <span className="badge badge-outline">RESERVED</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reservations</h1>
          <p className="page-subtitle">Manage guest bookings and check-ins</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Booking
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">All Bookings</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">Loading...</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No reservations found.</td></tr>
            ) : (
              reservations.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.guest_name}</strong></td>
                  <td>Room {r.unit_number}</td>
                  <td>{new Date(r.check_in).toLocaleDateString()}</td>
                  <td>{new Date(r.check_out).toLocaleDateString()}</td>
                  <td>{getStatusBadge(r)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {r.is_active && (
                        <>
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => handleAction(r.id, 'check-in')}
                            title="Check-In Guest"
                          >
                            <CheckCircle size={15} color="var(--accent-emerald)" /> Check-In
                          </button>
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => handleAction(r.id, 'check-out')}
                            title="Check-Out Guest & Invoice"
                          >
                            <LogOut size={15} color="var(--accent-rose)" /> Check-Out
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BookingModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        units={units} 
        guests={guests} 
        onSaved={() => fetchData()} 
      />
    </div>
  );
}
