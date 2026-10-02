import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, clearHistory, deleteHistoryItem } from '../api/history.js';
import { executeRequest } from '../api/proxy.js';
import useAppStore from '../store/appStore.js';
import Navbar from '../components/Navbar.jsx';
import { showConfirm } from '../lib/showConfirm.jsx';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

export default function HistoryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getHistory(50)
      .then((res) => setHistory(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleClear = async () => {
    if (!await showConfirm(t('clearHistoryConfirm', 'All saved requests will be removed from history.'), {
      title: t('clearHistory', 'Clear history'),
      confirmLabel: t('clearAll', 'Clear all'),
    })) return;
    await clearHistory();
    setHistory([]);
  };

  const handleDelete = async (id) => {
    await deleteHistoryItem(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleRetry = async (item) => {
    try {
      await executeRequest({
        method: item.requestData.method,
        url: item.requestData.url,
        headers: item.requestData.headers || {},
        queryParams: item.requestData.queryParams || {},
        body: item.requestData.body || undefined,
      });
      const res = await getHistory(50);
      setHistory(res.data.data);
      showToast(t('requestRetried', 'Request retried'), 'success');
    } catch (error) {
      showToast(t('retryFailed', 'Retry failed'), 'error');
    }
  };

  // Открыть запрос из истории в редакторе
  const openInEditor = (item) => {
    setActiveRequest({
      method: item.requestData.method,
      url: item.requestData.url,
      headers: item.requestData.headers || {},
      queryParams: {},
      body: item.requestData.body || '',
      localVariables: {},
      name: t('fromHistory', 'From history'),
    });
    navigate('/');
  };

  const statusColor = (s) =>
    !s ? '#888' : s >= 500 ? '#f93e3e' : s >= 400 ? '#fca130' : '#49cc90';

  return (
    <div className="app-layout">
      <Navbar />
      <div className="page-content">
        <div className="page-header request-history-header">
          <h2>{t('requestHistory', 'Request History')}</h2>
          <input
            className="history-search"
            placeholder={t('searchHistory', 'Search URL or method')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {history.length > 0 && (
            <button className="btn-danger" onClick={handleClear}>{t('clearAll', 'Clear all')}</button>
          )}
        </div>

        {loading && <p>{t('loading', 'Loading...')}</p>}

        {!loading && history.length === 0 && (
          <p className="empty-state">{t('noHistory', 'No history yet. Send some requests first.')}</p>
        )}

        <ul className="request-history-list">
          {history
            .filter((item) => {
              const query = search.trim().toLowerCase();
              if (!query) return true;
              return item.requestData.url.toLowerCase().includes(query)
                || item.requestData.method.toLowerCase().includes(query);
            })
            .map((item) => (
            <li key={item.id} className="request-history-item">
              <div className="request-history-main" onClick={() => openInEditor(item)}>
                <span
                  className="method-badge history-method-badge"
                >
                  {item.requestData.method}
                </span>
                <span className="request-history-url">{item.requestData.url}</span>
                <span className="status-badge" style={{ color: statusColor(item.responseData.status) }}>
                  {item.responseData.status || 'ERR'}
                </span>
                <span className="duration">{item.durationMs} ms</span>
                <span className="request-history-date">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <button className="btn-icon" onClick={() => handleRetry(item)} title={t('retry', 'Retry')}>↻</button>
              <button className="btn-icon danger history-delete-btn" onClick={() => handleDelete(item.id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
