import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      // Don't reveal if email exists or not for security
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow"></div>
      <div className="auth-card" style={{ maxWidth: '440px' }}>
        <div className="auth-logo">
          <div className="logo-big">B</div>
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">
            {sent
              ? 'If an account with that email exists, we\'ve generated a reset token.'
              : 'Enter your email and we\'ll provide a password reset token.'}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(20,184,166,0.1)', border: '1px solid var(--border-accent)',
              borderRadius: 12, padding: '20px', marginBottom: 20,
              color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6
            }}>
              <p>Since BashaCare doesn't have email integration yet, ask your
                <strong style={{ color: 'var(--accent-primary)' }}> System Administrator</strong> for
                a password reset. They can:</p>
              <ul style={{ textAlign: 'left', marginTop: 12, paddingLeft: 20 }}>
                <li>Reset your password from the Admin Panel</li>
                <li>Create a new login for you</li>
              </ul>
            </div>
            <Link to="/login" className="btn btn-primary w-full justify-center py-3">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4 justify-center py-3" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Request Password Reset'}
            </button>

            <div className="text-center text-sm text-muted" style={{ marginTop: 12 }}>
              Remember your password? <Link to="/login" className="text-accent font-bold">Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
