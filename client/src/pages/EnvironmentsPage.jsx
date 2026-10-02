import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import {
  getEnvironments, createEnvironment,
  updateEnvironment, deleteEnvironment,
} from '../api/environments.js';
import useAppStore from '../store/appStore.js';
import { showConfirm } from '../lib/showConfirm.jsx';
import { useI18n } from '../i18n/useI18n.js';

export default function EnvironmentsPage() {
  const { t } = useI18n();
  const { environments, setEnvironments } = useAppStore();
  const [selected, setSelected] = useState(null); // редактируемое окружение
  const [form, setForm] = useState({ name: '', variables: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEnvironments()
      .then((res) => {
        setEnvironments(res.data.data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  // Открыть окружение для редактирования
  const openEnv = (env) => {
    setSelected(env.id);
    setForm({ name: env.name, variables: env.variables || [] });
  };

  // Новое пустое окружение
  const newEnv = () => {
    setSelected('new');
    setForm({ name: '', variables: [] });
  };

  // Добавить строку переменной
  const addVar = () =>
    setForm((f) => ({ ...f, variables: [...f.variables, { key: '', value: '' }] }));

  // Изменить переменную
  const updateVar = (idx, field, val) => {
    const vars = [...form.variables];
    vars[idx] = { ...vars[idx], [field]: val };
    setForm((f) => ({ ...f, variables: vars }));
  };

  // Удалить переменную из формы
  const removeVar = (idx) =>
    setForm((f) => ({ ...f, variables: f.variables.filter((_, i) => i !== idx) }));

  // Сохранить
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected === 'new') {
        const res = await createEnvironment(form);
        setEnvironments([res.data.data, ...environments]);
        setSelected(res.data.data.id);
      } else {
        const res = await updateEnvironment(selected, form);
        setEnvironments(environments.map((e) => e.id === selected ? res.data.data : e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Удалить окружение
  const handleDelete = async (id) => {
    if (!await showConfirm(t('envDeleteConfirm', 'Variables for this environment will no longer be available.'), {
      title: t('deleteEnvironment', 'Delete environment'),
      confirmLabel: t('delete', 'Delete'),
    })) return;
    await deleteEnvironment(id);
    setEnvironments(environments.filter((e) => e.id !== id));
    if (selected === id) setSelected(null);
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="page-content env-page">
        <div className="env-sidebar">
          <div className="env-sidebar-header">
            <h2>{t('environments', 'Environments')}</h2>
            <button className="btn-new-small" onClick={newEnv}>+ {t('new', 'New')}</button>
          </div>
          {loading && <p>{t('loading', 'Loading...')}</p>}
          <ul className="env-list">
            {environments.map((env) => (
              <li
                key={env.id}
                className={`env-item ${selected === env.id ? 'active' : ''}`}
                onClick={() => openEnv(env)}
              >
                <span>{env.name}</span>
                <button
                  className="btn-icon danger"
                  onClick={(e) => { e.stopPropagation(); handleDelete(env.id); }}
                >✕</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Форма редактирования */}
        {selected && (
          <div className="env-editor">
            <form onSubmit={handleSave}>
              <input
                className="env-name-input"
                placeholder={t('environmentName', 'Environment name')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <h4>{t('variables', 'Variables')}</h4>
              <div className="kv-editor">
                {form.variables.map((v, i) => (
                  <div key={i} className="kv-row">
                    <input
                      placeholder={t('key', 'Key')}
                      value={v.key}
                      onChange={(e) => updateVar(i, 'key', e.target.value)}
                    />
                    <input
                      placeholder={t('value', 'Value')}
                      value={v.value}
                      onChange={(e) => updateVar(i, 'value', e.target.value)}
                    />
                    <button type="button" className="btn-icon danger" onClick={() => removeVar(i)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-add-kv" onClick={addVar}>
                  <span className="btn-add-kv__icon" aria-hidden>+</span>
                  {t('addVariable', 'Add variable')}
                </button>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                {t('save', 'Save')}
              </button>
            </form>
          </div>
        )}

        {!selected && (
          <div className="env-editor empty-state">
            {t('selectOrCreateEnvironment', 'Select or create an environment')}
          </div>
        )}
      </div>
    </div>
  );
}
