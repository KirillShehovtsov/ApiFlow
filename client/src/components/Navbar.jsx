import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import useAppStore from '../store/appStore.js';
import { useI18n } from '../i18n/useI18n.js';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale } = useI18n();
  const { user, logout } = useAuthStore();
  const { environments, activeEnvironmentId, setActiveEnvironmentId, theme, toggleTheme, toggleLocale } = useAppStore();
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const envMenuRef = useRef(null);

  useEffect(() => {
    if (!envMenuOpen) return;

    const onPointerDown = (event) => {
      if (!envMenuRef.current?.contains(event.target)) {
        setEnvMenuOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setEnvMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [envMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeEnvName = environments.find((env) => env.id === activeEnvironmentId)?.name || t('noEnvironment', 'No environment');

  const selectEnvironment = (id) => {
    setActiveEnvironmentId(id);
    setEnvMenuOpen(false);
  };

  return (
    <nav className="navbar">
      {/* Логотип — кликабельный, возвращает на главную */}
      <span
        className="navbar-brand"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
        title={t('goToMain', 'Go to main')}
      >
        ⚡ API Flow
      </span>

      {/* Кнопка возврата на главную — показываем только если не на главной */}
      {location.pathname !== '/' && (
        <button className="btn-home" onClick={() => navigate('/')} title={t('backToEditor', 'Back to editor')}>
          {t('brandEditor', 'Editor')}
        </button>
      )}

      <div className="navbar-center" ref={envMenuRef}>
        <button
          type="button"
          className={`env-picker-trigger ${envMenuOpen ? 'open' : ''}`}
          onClick={() => setEnvMenuOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={envMenuOpen}
        >
          <span className="env-picker-label">{t('environment', 'Environment')}</span>
          <span className="env-picker-value">{activeEnvName}</span>
          <span className="env-picker-arrow" aria-hidden>▾</span>
        </button>

        {envMenuOpen && (
          <div className={`env-picker-menu ${envMenuOpen ? 'open' : ''}`} role="listbox" aria-label="Select environment">
            <button
              type="button"
              className={`env-picker-item ${activeEnvironmentId == null ? 'active' : ''}`}
              onClick={() => selectEnvironment(null)}
              role="option"
              aria-selected={activeEnvironmentId == null}
            >
              <span>{t('noEnvironment', 'No environment')}</span>
              {activeEnvironmentId == null && <span className="env-picker-check">✓</span>}
            </button>
            {environments.map((env) => (
              <button
                key={env.id}
                type="button"
                className={`env-picker-item ${activeEnvironmentId === env.id ? 'active' : ''}`}
                onClick={() => selectEnvironment(env.id)}
                role="option"
                aria-selected={activeEnvironmentId === env.id}
              >
                <span>{env.name}</span>
                {activeEnvironmentId === env.id && <span className="env-picker-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="navbar-right">
        <button className="btn-home" onClick={toggleTheme} title={t('toggleTheme', 'Toggle theme')}>
          {theme === 'dark' ? t('light', 'Light') : t('dark', 'Dark')}
        </button>
        <button className="btn-home" onClick={toggleLocale} title={t('toggleLanguage', 'Toggle language')}>
          {locale === 'ru' ? 'EN' : 'RU'}
        </button>
        <button
          type="button"
          className={`btn-user ${location.pathname === '/profile' ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
          title={t('profileSettings', 'Profile settings')}
        >
          {user?.name || user?.email}
        </button>
        <button className="btn-logout" onClick={handleLogout}>{t('logout', 'Logout')}</button>
      </div>
    </nav>
  );
}
