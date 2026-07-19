import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    company_name: '', 
    full_name: '', 
    email: '', 
    password: '',
    contact_phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      toast.success('Registration successful! Please wait for admin approval.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow"></div>
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-logo mb-6">
          <h1 className="auth-title">Register Company</h1>
          <p className="auth-subtitle mb-0">Join BashaCare as a landlord</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Company / Property Name</label>
            <input 
              type="text" className="form-input" required
              value={formData.company_name}
              onChange={e => setFormData({...formData, company_name: e.target.value})}
            />
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input 
                type="text" className="form-input" required
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input 
                type="text" className="form-input" required
                value={formData.contact_phone}
                onChange={e => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" className="form-input" required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} className="form-input" required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4 justify-center py-3" disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Register Account'}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="text-accent font-bold">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
