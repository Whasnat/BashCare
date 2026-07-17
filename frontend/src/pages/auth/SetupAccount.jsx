import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User, Building, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      toast.error('No setup token provided');
      navigate('/login');
      return;
    }
    
    const fetchInfo = async () => {
      try {
        const { data } = await api.get(`/auth/invite-info?token=${token}`);
        setInviteInfo(data);
        setFormData(prev => ({
          ...prev,
          full_name: data.full_name || '',
          company_name: data.company_name || '',
        }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Invalid or expired setup link');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInfo();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setSubmitting(true);
    try {
      await api.post('/auth/accept-invite', {
        token,
        password: formData.password,
        full_name: formData.full_name,
        company_name: formData.company_name,
      });
      toast.success('Account activated! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to activate account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="spinner" style={{ width: 40, height: 40, color: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  const isLandlord = inviteInfo?.role === 'landlord';

  return (
    <div className="auth-page">
      <div className="auth-glow"></div>
      <div className="auth-card" style={{ maxWidth: '460px' }}>
        <div className="auth-logo">
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle2 size={28} color="white" />
          </div>
          <h1 className="auth-title">Complete Your Setup</h1>
          <p className="auth-subtitle">
            Welcome to BashaCare! You've been invited as a <strong>{inviteInfo.role}</strong>.<br/>
            ({inviteInfo.email})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {isLandlord && (
            <div className="form-group">
              <label className="form-label">Company / Organization Name</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Properties Ltd."
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Create Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                style={{ paddingLeft: 36, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                required
                minLength={8}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter your new password"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4 justify-center py-3" disabled={submitting}>
            {submitting ? <div className="spinner"></div> : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
