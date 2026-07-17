import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // await login("admin@email.com", "admin123");
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow"></div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-big">B</div>
          <h1 className="auth-title">Welcome to BashaCare</h1>
          <p className="auth-subtitle">Sign in to your property management dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="admin@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <Link to="/forgot-password" className="text-accent text-sm" style={{ fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4 justify-center py-3" disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Sign In'}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="text-center text-sm text-muted">
          Don't have an account? <Link to="/register" className="text-accent font-bold">Register your company</Link>
        </div>
      </div>
    </div>
  );
}
