import { useState } from 'react';
import { parseCurl } from '../api/curl.js';
import { useI18n } from '../i18n/useI18n.js';

// Модалка импорта curl-строки
// onImport(parsedRequest) — колбэк с распарсенным запросом
export default function CurlImportModal({ onClose, onImport }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!value.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await parseCurl(value.trim());
      onImport(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('failedParseCurl', 'Failed to parse cURL'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal curl-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('importFromCurl', 'Import from cURL')}</h3>
        <p className="curl-hint">{t('pasteCurlHint', 'Paste a curl command and it will be loaded into the editor')}</p>
        <textarea
          className="curl-input"
          placeholder={`curl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "John"}'`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          rows={6}
        />
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>{t('cancel', 'Cancel')}</button>
          <button type="submit" onClick={handleImport} disabled={loading || !value.trim()}>
            {loading ? t('parsing', 'Parsing...') : t('import', 'Import')}
          </button>
        </div>
      </div>
    </div>
  );
}
