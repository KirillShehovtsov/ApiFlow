import { useState } from 'react';
import useAppStore from '../store/appStore.js';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

// Панель ответа — статус, время, headers, body
export default function ResponsePanel() {
  const { t } = useI18n();
  const { response, loading } = useAppStore();
  const [tab, setTab] = useState('body');
  const [viewMode, setViewMode] = useState('pretty');

  if (loading) {
    return <div className="response-panel empty">{t('sendingRequest', 'Sending request...')}</div>;
  }

  if (!response) {
    return (
      <div className="response-panel empty">
        <div className="response-empty-card">
          <svg className="response-empty-icon" viewBox="0 0 48 48" fill="none" aria-hidden>
            <path
              d="M8 24L40 8l-8 32-6-14-14-6z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M22 26l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <p>{t('sendRequestToSeeResponse', 'Send a request to see the response')}</p>
        </div>
      </div>
    );
  }

  if (response.error) {
    return <div className="response-panel empty error">{t('requestError', 'Error')}: {response.error}</div>;
  }

  // Цвет статус-кода
  const statusColor =
    response.status >= 500 ? '#f93e3e'
    : response.status >= 400 ? '#fca130'
    : response.status >= 300 ? '#61affe'
    : '#49cc90';

  const bodyText = typeof response.body === 'string'
    ? response.body
    : JSON.stringify(response.body, null, 2);
  const rawBodyText = typeof response.body === 'string'
    ? response.body
    : JSON.stringify(response.body);

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(viewMode === 'pretty' ? bodyText : rawBodyText);
      showToast(t('responseCopied', 'Response copied'), 'success');
    } catch {
      showToast(t('failedCopyResponse', 'Failed to copy response'), 'error');
    }
  };

  return (
    <div className="response-panel">
      {/* Строка статуса */}
      <div className="response-meta">
        <span className="status-badge" style={{ color: statusColor }}>
          {response.status}
        </span>
        <span className="duration">{response.durationMs} ms</span>
        <div className="response-meta-actions">
          <button className={`btn-icon ${viewMode === 'pretty' ? 'active' : ''}`} onClick={() => setViewMode('pretty')}>{t('pretty', 'Pretty')}</button>
          <button className={`btn-icon ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => setViewMode('raw')}>{t('raw', 'Raw')}</button>
          <button className="btn-icon" onClick={copyBody}>{t('copy', 'Copy')}</button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="tabs">
        {['body', 'headers'].map((tabKey) => (
          <button
            key={tabKey}
            className={`tab ${tab === tabKey ? 'active' : ''}`}
            onClick={() => setTab(tabKey)}
          >
            {tabKey === 'body' ? t('body', 'Body') : t('headers', 'Headers')}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'body' && (
          <pre className="response-body">{viewMode === 'pretty' ? bodyText : rawBodyText}</pre>
        )}
        {tab === 'headers' && (
          <table className="headers-table">
            <tbody>
              {Object.entries(response.headers || {}).map(([k, v]) => (
                <tr key={k}>
                  <td className="header-key">{k}</td>
                  <td className="header-val">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
