import { useState, useEffect } from 'react';
import { Save, Building2, Smartphone, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {Icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
        )}
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: 2 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function NumberBadge({ label, value, color = 'teal' }) {
  const colorMap = {
    teal: { bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)', text: 'var(--accent-primary)' },
    green: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: 'var(--accent-emerald)' },
    purple: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: 'var(--accent-secondary)' },
  };
  const c = colorMap[color] || colorMap.teal;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '8px 14px',
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: c.text, fontSize: '0.95rem' }}>
        {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Not set</span>}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  bkash_personal_number: '',
  nagad_personal_number: '',
  rocket_personal_number: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_routing_number: '',
  bank_name: '',
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [payment, setPayment] = useState(EMPTY_FORM);
  const [profileForm, setProfileForm] = useState({ company_name: '', contact_phone: '' });
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const { t } = useTranslation();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      setProfile(data);
      const filled = {
        bkash_personal_number: data.bkash_personal_number || '',
        nagad_personal_number: data.nagad_personal_number || '',
        rocket_personal_number: data.rocket_personal_number || '',
        bank_account_name: data.bank_account_name || '',
        bank_account_number: data.bank_account_number || '',
        bank_routing_number: data.bank_routing_number || '',
        bank_name: data.bank_name || '',
      };
      setPayment(filled);
      setProfileForm({ company_name: data.company_name || '', contact_phone: data.contact_phone || '' });
      setPaymentDirty(false);
      setProfileDirty(false);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const setP = (field) => (e) => {
    setPayment(prev => ({ ...prev, [field]: e.target.value }));
    setPaymentDirty(true);
  };

  const setProf = (field) => (e) => {
    setProfileForm(prev => ({ ...prev, [field]: e.target.value }));
    setProfileDirty(true);
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.patch('/settings/payment', payment);
      toast.success('Payment details saved');
      setPaymentDirty(false);
      fetchSettings();
    } catch {
      toast.error('Failed to save payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/settings/profile', profileForm);
      toast.success('Profile updated');
      setProfileDirty(false);
      fetchSettings();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return (
    <div className="flex-col gap-4">
      <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* ── Profile ───────────────────────────────── */}
      <SectionCard
        title="Account Profile"
        subtitle="Your company name and contact details shown to tenants"
        icon={Building2}
      >
        <form onSubmit={saveProfile}>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Company / Property Name</label>
              <input
                className="form-input"
                value={profileForm.company_name}
                onChange={setProf('company_name')}
                placeholder={t('settings.phCompanyName')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                className="form-input"
                value={profileForm.contact_phone}
                onChange={setProf('contact_phone')}
                placeholder={t('settings.phPhone')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" value={profile?.contact_email || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Plan Tier</label>
              <input className="form-input" value={profile?.plan_tier || 'starter'} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed', textTransform: 'capitalize' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile || !profileDirty} style={{ minWidth: 140 }}>
              {savingProfile ? <span className="spinner" /> : <Save size={15} />}
              {profileDirty ? t('common.save') : t('common.save')}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Mobile Banking Numbers ─────────────────── */}
      <form onSubmit={savePayment}>
        <SectionCard
          title="Mobile Banking Numbers"
          subtitle="Tenants will send rent to these numbers via bKash / Nagad / Rocket Send Money, then submit their Transaction ID for your confirmation"
          icon={Smartphone}
        >
          {/* Live preview strip */}
          {(payment.bkash_personal_number || payment.nagad_personal_number || payment.rocket_personal_number) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: '12px 14px', background: 'rgba(20,184,166,0.04)', borderRadius: 10, border: '1px solid rgba(20,184,166,0.12)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>Shown to tenants:</span>
              {payment.bkash_personal_number && <NumberBadge label="bKash" value={payment.bkash_personal_number} color="teal" />}
              {payment.nagad_personal_number && <NumberBadge label="Nagad" value={payment.nagad_personal_number} color="green" />}
              {payment.rocket_personal_number && <NumberBadge label="Rocket" value={payment.rocket_personal_number} color="purple" />}
            </div>
          )}

          <div className="form-grid">
            {[
              { field: 'bkash_personal_number', label: 'bKash Personal Number', placeholder: '01XXXXXXXXX', hint: 'Tenants send money to this bKash number' },
              { field: 'nagad_personal_number', label: 'Nagad Personal Number', placeholder: '01XXXXXXXXX', hint: 'Tenants send money to this Nagad number' },
              { field: 'rocket_personal_number', label: 'Rocket Personal Number', placeholder: '01XXXXXXXXX', hint: 'Tenants send money to this Rocket number' },
            ].map(({ field, label, placeholder, hint }) => (
              <div className="form-group" key={field}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input"
                  placeholder={placeholder}
                  value={payment[field]}
                  onChange={setP(field)}
                />
                <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 3 }}>{hint}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertCircle size={15} style={{ color: 'var(--accent-amber)', marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              <strong>How it works:</strong> Tenants see these numbers on their invoice page, make a Send Money transfer, then submit the Transaction ID. You review and confirm the payment from the Payments page.
            </p>
          </div>
        </SectionCard>

        {/* ── Bank Transfer Details ──────────────────── */}
        <SectionCard
          title="Bank Transfer Details"
          subtitle="For tenants who prefer to pay via bank wire transfer"
          icon={CreditCard}
        >
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input className="form-input" placeholder={t('settings.phName')} value={payment.bank_account_name} onChange={setP('bank_account_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-input" placeholder={t('settings.phAccountNum')} value={payment.bank_account_number} onChange={setP('bank_account_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-input" placeholder={t('settings.phBankName')} value={payment.bank_name} onChange={setP('bank_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Routing Number</label>
              <input className="form-input" placeholder={t('settings.phRoutingNum')} value={payment.bank_routing_number} onChange={setP('bank_routing_number')} />
            </div>
          </div>
        </SectionCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <button type="submit" className="btn btn-primary" id="save-payment-btn" disabled={savingPayment || !paymentDirty} style={{ minWidth: 200 }}>
            {savingPayment ? <span className="spinner" /> : <Save size={15} />}
            {paymentDirty ? t('common.save') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
