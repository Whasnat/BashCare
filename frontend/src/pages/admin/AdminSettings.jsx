import { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, Info } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    allow_new_registrations: true,
    default_trial_days: 14,
    system_announcement: '',
    maintenance_mode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/settings');
      if (data.id) {
        setSettings({
          allow_new_registrations: data.allow_new_registrations ?? true,
          default_trial_days: data.default_trial_days ?? 14,
          system_announcement: data.system_announcement || '',
          maintenance_mode: data.maintenance_mode ?? false
        });
      }
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/admin/settings', settings);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title"><Settings style={{ marginRight: 12 }} />Platform Settings</h1>
            <p className="page-subtitle">Configure global platform behavior</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Settings style={{ marginRight: 12 }} />Platform Settings</h1>
          <p className="page-subtitle">Configure global platform behavior</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Allow New Landlord Registrations
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                type="button"
                className={`btn ${settings.allow_new_registrations ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSettings(s => ({...s, allow_new_registrations: true}))}
              >
                Enabled
              </button>
              <button 
                type="button"
                className={`btn ${!settings.allow_new_registrations ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => setSettings(s => ({...s, allow_new_registrations: false}))}
              >
                Disabled
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              If disabled, the registration page will show a "Signups closed" message.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Default Trial Period (Days)</label>
            <input 
              type="number" 
              className="form-input" 
              min="0"
              value={settings.default_trial_days}
              onChange={(e) => setSettings(s => ({...s, default_trial_days: parseInt(e.target.value) || 0}))}
              style={{ maxWidth: 200 }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Number of days a new landlord gets on the Pro plan before billing starts.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} color="var(--accent-primary)" />
              System Announcement Banner
            </label>
            <textarea 
              className="form-input" 
              rows={3}
              placeholder="e.g. Scheduled maintenance on Friday at 2AM UTC."
              value={settings.system_announcement}
              onChange={(e) => setSettings(s => ({...s, system_announcement: e.target.value}))}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              This message will be displayed at the top of the screen for all logged-in users. Leave empty to hide.
            </p>
          </div>

          <div className="form-group" style={{ padding: 16, background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)' }}>
              <AlertTriangle size={16} />
              Maintenance Mode
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                type="button"
                className={`btn ${settings.maintenance_mode ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => setSettings(s => ({...s, maintenance_mode: true}))}
                style={{ color: settings.maintenance_mode ? 'white' : 'var(--accent-rose)' }}
              >
                Enable Maintenance Mode
              </button>
              <button 
                type="button"
                className={`btn ${!settings.maintenance_mode ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSettings(s => ({...s, maintenance_mode: false}))}
              >
                Normal Operation
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
              When enabled, all non-admin users will be blocked from accessing the platform.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} style={{ marginRight: 8 }} />}
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
