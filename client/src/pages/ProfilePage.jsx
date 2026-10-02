import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import useAuthStore from '../store/authStore.js';
import { getProfile, updateProfile } from '../api/auth.js';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

export default function ProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [initialLoading, setInitialLoading] = useState(!user);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) return;

    getProfile()
      .then((res) => {
        setUser(res.data.data);
      })
      .catch((err) => {
        showToast(err.response?.data?.message || t('failedLoadProfile', 'Failed to load profile'), 'error');
      })
      .finally(() => setInitialLoading(false));
  }, [user, setUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = t('nameRequired', 'Name is required');
    }
    
    if (!form.email.trim()) {
      newErrors.email = t('emailRequired', 'Email is required');
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = t('invalidEmail', 'Invalid email format');
    }
    
    if (form.newPassword) {
      if (!form.currentPassword) {
        newErrors.currentPassword = t('currentPasswordRequired', 'Current password is required to change password');
      }
      
      if (form.newPassword.length < 6) {
        newErrors.newPassword = t('passwordMinLength', 'Password must be at least 6 characters');
      }
      
      if (form.newPassword !== form.confirmPassword) {
        newErrors.confirmPassword = t('passwordsMismatch', 'Passwords do not match');
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    try {
      // Подготавливаем данные для отправки
      const data = {
        name: form.name,
        email: form.email,
      };
      
      if (form.newPassword) {
        data.currentPassword = form.currentPassword;
        data.newPassword = form.newPassword;
      }
      
      const res = await updateProfile(data);
      setUser(res.data.data);
      
      // Сбрасываем поля пароля
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      showToast(t('profileUpdated', 'Profile updated successfully'), 'success');
    } catch (err) {
      const message = err.response?.data?.message || t('failedUpdateProfile', 'Failed to update profile');
      showToast(message, 'error');
      
      // Если ошибка связана с паролем
      if (message.includes('password')) {
        setErrors((prev) => ({ ...prev, currentPassword: message }));
      } else if (message.includes('email')) {
        setErrors((prev) => ({ ...prev, email: message }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="app-layout">
        <Navbar />
        <div className="page-content profile-page">
          <div className="profile-card profile-card-loading">{t('loadingProfile', 'Loading profile...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar />
      <div className="page-content profile-page">
        <div className="profile-header">
          <h1>{t('profileSettings', 'Profile Settings')}</h1>
          <p>{t('updateProfileDescription', 'Update your personal information and password')}</p>
        </div>
        <div className="profile-panels">
          <div className="profile-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{t('name', 'Name')}</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t('yourName', 'Your name')}
                  className={errors.name ? 'profile-input-error' : ''}
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">{t('email', 'Email')}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t('yourEmail', 'your@email.com')}
                  className={errors.email ? 'profile-input-error' : ''}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              
              <div className="form-section">
                <h3>{t('changePassword', 'Change Password')}</h3>
                <p className="form-hint">{t('leaveBlankPassword', "Leave blank if you don't want to change password")}</p>
                
                <div className="form-group">
                  <label htmlFor="currentPassword">{t('currentPassword', 'Current Password')}</label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    placeholder={t('enterCurrentPassword', 'Enter current password')}
                    className={errors.currentPassword ? 'profile-input-error' : ''}
                  />
                  {errors.currentPassword && <div className="error-message">{errors.currentPassword}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="newPassword">{t('newPassword', 'New Password')}</label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={handleChange}
                    placeholder={t('enterNewPassword', 'Enter new password')}
                    className={errors.newPassword ? 'profile-input-error' : ''}
                  />
                  {errors.newPassword && <div className="error-message">{errors.newPassword}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('confirmNewPassword', 'Confirm New Password')}</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('confirmNewPasswordPlaceholder', 'Confirm new password')}
                    className={errors.confirmPassword ? 'profile-input-error' : ''}
                  />
                  {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/')}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? t('saving', 'Saving...') : t('saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
          
          <div className="profile-info">
            <h3>{t('accountInformation', 'Account Information')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">{t('accountCreated', 'Account Created')}</span>
                <span className="info-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('na', 'N/A')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('userId', 'User ID')}</span>
                <span className="info-value">{user?.id || t('na', 'N/A')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}