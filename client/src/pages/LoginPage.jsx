import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth.js';
import useAuthStore from '../store/authStore.js';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/useI18n.js';

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      setAuth(res.data.data.token, res.data.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('loginFailed', 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthBrand />
        <h1>API Flow</h1>
        <h2>{t('signIn', 'Sign in')}</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder={t('email', 'Email')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder={t('password', 'Password')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? t('signingIn', 'Signing in...') : t('signIn', 'Sign in')}
          </button>
        </form>
        <p>
          {t('noAccount', 'No account?')} <Link to="/register">{t('register', 'Register')}</Link>
        </p>
      </div>
    </div>
  );
}
