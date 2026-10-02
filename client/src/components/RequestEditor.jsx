import { useState } from 'react';
import useAppStore from '../store/appStore.js';
import { executeRequest } from '../api/proxy.js';
import { createRequest, updateRequest } from '../api/requests.js';
import { getCollections } from '../api/collections.js';
import CurlImportModal from './CurlImportModal.jsx';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const VAR_PATTERN = /\{\{\s*([^{}\s]+)\s*\}\}/g;

const resolveTemplate = (value, variables) => {
  if (typeof value !== 'string') return value;
  return value.replace(VAR_PATTERN, (_, variableName) => {
    const key = String(variableName || '').trim();
    if (!key) return _;
    return Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : _;
  });
};

const resolveObjectTemplates = (obj, variables) => Object.fromEntries(
  Object.entries(obj || {}).map(([key, val]) => [resolveTemplate(key, variables), resolveTemplate(val, variables)])
);

const buildCodeSnippets = ({ method, url, headers, body }) => {
  const normalizedMethod = (method || 'GET').toUpperCase();
  const bodyValue = typeof body === 'string' ? body : JSON.stringify(body ?? {}, null, 2);
  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod) && bodyValue?.trim();
  const headerEntries = Object.entries(headers || {});
  const jsHeaders = headerEntries.length
    ? `headers: ${JSON.stringify(headers, null, 2)},\n`
    : '';
  const fetchBody = hasBody ? `body: JSON.stringify(${bodyValue}),\n` : '';
  const axiosBody = hasBody ? `,\n  ${bodyValue}` : '';
  const curlHeaders = headerEntries.map(([k, v]) => `  -H "${k}: ${String(v).replace(/"/g, '\\"')}"`).join(' \\\n');
  const curlBody = hasBody ? ` \\\n  -d '${bodyValue.replace(/'/g, "\\'")}'` : '';

  return {
    curl: `curl -X ${normalizedMethod} "${url}"${curlHeaders ? ` \\\n${curlHeaders}` : ''}${curlBody}`,
    fetch: `const response = await fetch(${JSON.stringify(url)}, {
  method: ${JSON.stringify(normalizedMethod)},
  ${jsHeaders}${fetchBody}});

const data = await response.json();
console.log(data);`,
    axios: `import axios from 'axios';

const response = await axios.${normalizedMethod.toLowerCase()}(
  ${JSON.stringify(url)}${axiosBody ? axiosBody : ''}
  ${headerEntries.length ? `,\n  { headers: ${JSON.stringify(headers, null, 2)} }` : ''}
);

console.log(response.data);`,
  };
};

// Вынесен за пределы RequestEditor — иначе React пересоздаёт компонент
// при каждом изменении стейта и инпут теряет фокус
function KVEditor({ value, onChange }) {
  const { t } = useI18n();
  // Храним entries локально чтобы пустые ключи не удалялись во время ввода
  const entries = Object.entries(value || {});

  const update = (idx, field, val) => {
    const next = [...entries];
    next[idx] = field === 'key'
      ? [val, next[idx][1]]
      : [next[idx][0], val];
    // Передаём все записи включая с пустым ключом — фильтрация при отправке
    onChange(Object.fromEntries(next));
  };

  const add = () => {
    // Добавляем новую пустую строку с уникальным временным ключом
    const tempKey = `__new_${Date.now()}`;
    onChange({ ...value, [tempKey]: '' });
  };

  const remove = (idx) => {
    const next = entries.filter((_, i) => i !== idx);
    onChange(Object.fromEntries(next));
  };

  return (
    <div className="kv-editor">
      {entries.map(([k, v], i) => (
        <div key={i} className="kv-row">
          <input
            placeholder={t('key', 'Key')}
            value={k.startsWith('__new_') ? '' : k}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            placeholder={t('value', 'Value')}
            value={v}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button className="btn-icon danger" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-add-kv" onClick={add}>
        <span className="btn-add-kv__icon" aria-hidden>+</span>
        {t('add', 'Add')}
      </button>
    </div>
  );
}

// Редактор запроса — URL-строка, метод, вкладки params/headers/body
export default function RequestEditor() {
  const { t } = useI18n();
  const {
    activeRequest,
    updateActiveRequest,
    setActiveRequest,
    setResponse,
    setLoading,
    loading,
    collections,
    setCollections,
    activeEnvironmentId,
    environments,
    addCollectionRequest,
    updateCollectionRequest,
  } = useAppStore();

  const [tab, setTab] = useState('params');
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveColId, setSaveColId] = useState('');
  const [curlModal, setCurlModal] = useState(false);
  const [snippetModal, setSnippetModal] = useState(false);
  const [snippetTab, setSnippetTab] = useState('curl');
  const [methodMenuOpen, setMethodMenuOpen] = useState(false);

  // Загрузить распарсенный curl в редактор
  const handleCurlImport = (parsed) => {
    updateActiveRequest({
      method: parsed.method,
      url: parsed.url,
      headers: parsed.headers,
      queryParams: parsed.queryParams,
      body: parsed.body,
      name: t('importedFromCurl', 'Imported from cURL'),
      localVariables: {},
    });
  };

  const cleanObj = (obj) => Object.fromEntries(
    Object.entries(obj || {}).filter(([k]) => k && !k.startsWith('__new_') && k.trim() !== '')
  );

  const getResolvedRequestData = () => {
    const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId);
    const envVars = Object.fromEntries((activeEnvironment?.variables || [])
      .filter((item) => item?.key)
      .map((item) => [String(item.key).trim(), item.value ?? '']));
    const localVars = cleanObj(activeRequest.localVariables);
    const mergedVars = { ...envVars, ...localVars };

    return {
      method: activeRequest.method,
      url: resolveTemplate(activeRequest.url, mergedVars),
      headers: resolveObjectTemplates(cleanObj(activeRequest.headers), mergedVars),
      queryParams: resolveObjectTemplates(cleanObj(activeRequest.queryParams), mergedVars),
      body: resolveTemplate(activeRequest.body || '', mergedVars) || undefined,
    };
  };

  // Отправить запрос
  const handleSend = async () => {
    if (!activeRequest.url) return;
    setLoading(true);
    setResponse(null);
    try {
      const resolved = getResolvedRequestData();
      const res = await executeRequest(resolved);
      setResponse(res.data.data);
    } catch (e) {
      setResponse({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Сохранить запрос в коллекцию
  const handleSave = async (e, forceCreate = false) => {
    e.preventDefault();
    if (!saveName || !saveColId) return;
    const collectionId = parseInt(saveColId, 10);
    const payload = {
      name: saveName,
      method: activeRequest.method,
      url: activeRequest.url,
      headers: activeRequest.headers,
      queryParams: activeRequest.queryParams,
      body: activeRequest.body,
    };
    try {
      if (activeRequest.id && !forceCreate) {
        await updateRequest(activeRequest.id, payload);
        const colId = activeRequest.collectionId;
        if (colId) {
          updateCollectionRequest(colId, activeRequest.id, {
            name: saveName,
            method: activeRequest.method,
            url: activeRequest.url,
            headers: JSON.stringify(activeRequest.headers || {}),
            queryParams: JSON.stringify(activeRequest.queryParams || {}),
            body: activeRequest.body || '',
          });
        }
        setActiveRequest({ ...activeRequest, name: saveName });
      } else {
        const res = await createRequest({ ...payload, collectionId });
        const saved = res.data.data;
        addCollectionRequest(collectionId, saved);
        setActiveRequest({
          ...activeRequest,
          id: saved.id,
          name: saveName,
          collectionId: saved.collectionId,
        });
      }
      setSaveModal(false);
      showToast(forceCreate ? t('requestSavedAsNew', 'Request saved as new') : t('requestSaved', 'Request saved'), 'success');
    } catch (e) {
      console.error(e);
      showToast(t('failedSaveRequest', 'Failed to save request'), 'error');
    }
  };

  const handleCopySnippet = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('codeCopied', 'Code copied to clipboard'), 'success');
    } catch {
      showToast(t('failedCopyCode', 'Failed to copy code'), 'error');
    }
  };

  const snippets = buildCodeSnippets(getResolvedRequestData());

  const openSaveModal = async () => {
    setSaveName(activeRequest.name || '');
    setSaveColId(collections[0]?.id || '');
    if (!collections.length) {
      const res = await getCollections();
      setCollections(res.data.data);
      setSaveColId(res.data.data[0]?.id || '');
    }
    setSaveModal(true);
  };

  return (
    <div className="request-editor">
      {/* URL-строка */}
      <div className="url-bar">
        <div className={`method-select-wrap method-select-wrap--${activeRequest.method}`}>
          <select
            className={`method-select ${methodMenuOpen ? 'open' : ''}`}
            value={activeRequest.method}
            onChange={(e) => updateActiveRequest({ method: e.target.value })}
            onFocus={() => setMethodMenuOpen(true)}
            onBlur={() => setMethodMenuOpen(false)}
            onClick={() => setMethodMenuOpen(true)}
            aria-label="HTTP method"
          >
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="url-field">
          <input
            className="url-input url-input-full"
            placeholder={t('requestUrlPlaceholder', 'https://api.example.com or {{baseUrl}}')}
            value={activeRequest.url}
            onChange={(e) => updateActiveRequest({ url: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            aria-label="Request URL"
          />
        </div>
        <button className="btn-send" onClick={handleSend} disabled={loading}>
          {loading ? '…' : t('send', 'Send')}
        </button>
        <button className="btn-save" onClick={openSaveModal}>{t('save', 'Save')}</button>
        <button className="btn-save" onClick={() => setSnippetModal(true)}>{t('code', 'Code')}</button>
        <button className="btn-curl" onClick={() => setCurlModal(true)} title={t('importFromCurl', 'Import from cURL')}>
          cURL
        </button>
      </div>

      {/* Вкладки */}
      <div className="tabs">
        {['params', 'headers', 'body', 'variables'].map((tabKey) => (
          <button
            key={tabKey}
            className={`tab ${tab === tabKey ? 'active' : ''}`}
            onClick={() => setTab(tabKey)}
          >
            {tabKey === 'params' ? t('params', 'Params')
              : tabKey === 'headers' ? t('headers', 'Headers')
              : tabKey === 'body' ? t('body', 'Body')
              : t('variables', 'Variables')}
          </button>
        ))}
      </div>

      {/* Содержимое вкладки */}
      <div className="tab-content">
        {tab === 'params' && (
          <KVEditor
            value={activeRequest.queryParams}
            onChange={(v) => updateActiveRequest({ queryParams: v })}
          />
        )}
        {tab === 'headers' && (
          <KVEditor
            value={activeRequest.headers}
            onChange={(v) => updateActiveRequest({ headers: v })}
          />
        )}
        {tab === 'body' && (
          <textarea
            className="body-editor"
            placeholder='{"key": "value"}'
            value={activeRequest.body}
            onChange={(e) => updateActiveRequest({ body: e.target.value })}
          />
        )}
        {tab === 'variables' && (
          <KVEditor
            value={activeRequest.localVariables || {}}
            onChange={(v) => updateActiveRequest({ localVariables: v })}
          />
        )}
      </div>

      {curlModal && (
        <CurlImportModal
          onClose={() => setCurlModal(false)}
          onImport={handleCurlImport}
        />
      )}

      {/* Модалка сохранения */}
      {saveModal && (
        <div className="modal-overlay" onClick={() => setSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('saveRequest', 'Save request')}</h3>
            <form onSubmit={handleSave}>
              <input
                placeholder={t('requestName', 'Request name')}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                required
              />
              <select value={saveColId} onChange={(e) => setSaveColId(e.target.value)} required>
                <option value="">{t('selectCollection', 'Select collection')}</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="modal-actions">
                <button type="submit">{t('save', 'Save')}</button>
                <button type="button" onClick={(e) => handleSave(e, true)}>{t('saveAsNew', 'Save as new')}</button>
                <button type="button" onClick={() => setSaveModal(false)}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {snippetModal && (
        <div className="modal-overlay" onClick={() => setSnippetModal(false)}>
          <div className="modal code-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('generateSnippet', 'Generate code snippet')}</h3>
            <div className="tabs">
              {['curl', 'fetch', 'axios'].map((t) => (
                <button
                  key={t}
                  className={`tab ${snippetTab === t ? 'active' : ''}`}
                  onClick={() => setSnippetTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <pre className="snippet-block">{snippets[snippetTab]}</pre>
            <div className="modal-actions">
              <button type="button" onClick={() => handleCopySnippet(snippets[snippetTab])}>{t('copy', 'Copy')}</button>
              <button type="button" onClick={() => setSnippetModal(false)}>{t('close', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
