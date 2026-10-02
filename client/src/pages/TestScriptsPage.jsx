import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import {
  getScriptsByRequest, createScript, updateScript,
  deleteScript, runScript, getScriptRuns,
} from '../api/testscripts.js';
import { getRequestById } from '../api/requests.js';
import { executeRequest } from '../api/proxy.js';
import useAppStore from '../store/appStore.js';
import { showConfirm } from '../lib/showConfirm.jsx';
import { useI18n } from '../i18n/useI18n.js';

// Примеры кода для подсказки новым пользователям
const CODE_TEMPLATE = `// Доступные объекты:
// pm.response.status  — HTTP статус (200, 404, ...)
// pm.response.body    — тело ответа (объект или строка)
// pm.response.time    — время ответа в мс
// pm.test(name, fn)   — объявить тест
// pm.expect(val)      — ассерты

pm.test("Status is 200", () => {
  pm.expect(pm.response.status).to.equal(200);
});

pm.test("Response time < 1000ms", () => {
  pm.expect(pm.response.time).to.be.below(1000);
});

pm.test("Body has items", () => {
  const body = pm.response.body;
  pm.expect(Array.isArray(body)).to.equal(true);
});
`;

export default function TestScriptsPage() {
  const { t } = useI18n();
  const { requestId } = useParams();
  const { activeEnvironmentId } = useAppStore();

  const [request, setRequest] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [selected, setSelected] = useState(null);   // id выбранного скрипта
  const [form, setForm] = useState({ name: '', code: CODE_TEMPLATE });
  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [liveRun, setLiveRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editor'); // editor | runs
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/load-tests?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'test-script:update') return;
        const payload = data.payload || {};
        if (payload.event === 'started') {
          setLiveRun({ runId: payload.runId, status: 'running', results: [] });
          setActiveTab('runs');
          return;
        }
        if (payload.event === 'progress') {
          setLiveRun({
            runId: payload.runId,
            status: 'running',
            results: payload.results || [],
          });
          setActiveTab('runs');
          return;
        }
        if (payload.event === 'completed') {
          setLiveRun({
            runId: payload.runId,
            status: payload.status,
            results: payload.results || [],
          });
        }
      } catch {
        // ignore malformed ws payload
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = parseInt(requestId);
    Promise.all([
      getRequestById(id),
      getScriptsByRequest(id),
    ]).then(([reqRes, scriptsRes]) => {
      setRequest(reqRes.data.data);
      setScripts(scriptsRes.data.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [requestId]);

  // Открыть скрипт для редактирования
  const openScript = async (script) => {
    setSelected(script.id);
    setForm({ name: script.name, code: script.code });
    setLastResult(null);
    // Загружаем историю запусков
    const res = await getScriptRuns(script.id);
    setRuns(res.data.data);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe:test-script', scriptId: String(script.id) }));
    } else {
      wsRef.current?.addEventListener('open', () => {
        wsRef.current?.send(JSON.stringify({ type: 'subscribe:test-script', scriptId: String(script.id) }));
      }, { once: true });
    }
    setActiveTab('editor');
  };

  // Новый скрипт
  const newScript = () => {
    setSelected('new');
    setForm({ name: '', code: CODE_TEMPLATE });
    setRuns([]);
    setLastResult(null);
    setActiveTab('editor');
  };

  // Сохранить
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (selected === 'new') {
        const res = await createScript({ requestId: parseInt(requestId), ...form });
        setScripts((prev) => [...prev, res.data.data]);
        setSelected(res.data.data.id);
      } else {
        const res = await updateScript(selected, form);
        setScripts((prev) => prev.map((s) => s.id === selected ? res.data.data : s));
      }
    } catch (err) { console.error(err); }
  };

  // Запустить скрипт — сначала выполняем запрос, потом прогоняем скрипт
  const handleRun = async () => {
    if (!request || selected === 'new') return;
    setRunning(true);
    setLastResult(null);
    setLiveRun(null);
    try {
      // 1. Выполняем HTTP-запрос
      const proxyRes = await executeRequest({
        method: request.method,
        url: request.url,
        headers: JSON.parse(request.headers || '{}'),
        queryParams: JSON.parse(request.queryParams || '{}'),
        body: request.body || undefined,
        environmentId: activeEnvironmentId || undefined,
      });

      const responseData = proxyRes.data.data;

      // 2. Прогоняем тест-скрипт против полученного ответа
      const runRes = await runScript(selected, responseData);
      setLastResult(runRes.data.data);
      setLiveRun((prev) => prev?.runId === runRes.data.data.runId ? { ...prev, status: runRes.data.data.status } : prev);

      // Обновляем историю запусков
      const runsRes = await getScriptRuns(selected);
      setRuns(runsRes.data.data);
      setActiveTab('runs');
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  // Удалить скрипт
  const handleDelete = async (id) => {
    if (!await showConfirm(t('deleteScriptConfirm', 'The script and its past run results will be removed.'), {
      title: t('deleteTestScript', 'Delete test script'),
      confirmLabel: t('delete', 'Delete'),
    })) return;
    await deleteScript(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (selected === id) { setSelected(null); setLastResult(null); }
  };

  const statusColor = (s) => s === 'passed' ? 'var(--green)' : s === 'failed' ? 'var(--red)' : 'var(--text-muted)';

  return (
    <div className="app-layout">
      <Navbar />
      <div className="page-content ts-page">

        {/* Левая панель — список скриптов */}
        <div className="ts-sidebar">
          <div className="ts-sidebar-header">
            <div>
              <div className="ts-request-label">{t('testScriptsFor', 'Test scripts for')}</div>
              <div className="ts-request-name">{request?.name || '...'}</div>
            </div>
            <button className="btn-new-small" onClick={newScript}>+ {t('new', 'New')}</button>
          </div>

          {loading && <p style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{t('loading', 'Loading...')}</p>}

          <ul className="ts-list">
            {scripts.map((s) => (
              <li
                key={s.id}
                className={`ts-item ${selected === s.id ? 'active' : ''}`}
                onClick={() => openScript(s)}
              >
                <span className="ts-item-name">{s.name}</span>
                <button
                  className="btn-icon danger"
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                >✕</button>
              </li>
            ))}
            {!loading && scripts.length === 0 && (
              <li className="ts-empty">{t('noScriptsYet', 'No scripts yet')}</li>
            )}
          </ul>
        </div>

        {/* Правая панель — редактор + результаты */}
        {selected ? (
          <div className="ts-editor">
            {/* Заголовок */}
            <div className="ts-editor-header">
              <input
                className="ts-name-input"
                placeholder={t('scriptName', 'Script name')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div className="ts-editor-actions">
                <button className="btn-save" onClick={handleSave}>{t('save', 'Save')}</button>
                <button
                  className="btn-run"
                  onClick={handleRun}
                  disabled={running || selected === 'new'}
                >
                  {running ? t('running', 'Running...') : `▶ ${t('run', 'Run')}`}
                </button>
              </div>
            </div>

            {/* Вкладки */}
            <div className="tabs">
              {['editor', 'runs'].map((tabKey) => (
                <button
                  key={tabKey}
                  className={`tab ${activeTab === tabKey ? 'active' : ''}`}
                  onClick={() => setActiveTab(tabKey)}
                >
                  {tabKey === 'editor' ? t('script', 'Script') : t('runHistory', 'Run History')}
                </button>
              ))}
            </div>

            {/* Редактор кода */}
            {activeTab === 'editor' && (
              <textarea
                className="ts-code-editor"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                spellCheck={false}
              />
            )}

            {/* История запусков */}
            {activeTab === 'runs' && (
              <div className="ts-runs">
                {/* Последний результат — показываем сразу после запуска */}
                {lastResult && (
                  <div className="ts-run-result">
                    <div className="ts-run-header">
                      <span style={{ color: statusColor(lastResult.status), fontWeight: 700 }}>
                        {lastResult.status.toUpperCase()}
                      </span>
                      <span className="ts-run-meta">
                        {lastResult.results.filter((r) => r.passed).length} / {lastResult.results.length} passed
                      </span>
                    </div>
                    <ul className="ts-results-list">
                      {lastResult.results.map((r, i) => (
                        <li key={i} className={`ts-result-item ${r.passed ? 'passed' : 'failed'}`}>
                          <span className="ts-result-icon">{r.passed ? '✓' : '✗'}</span>
                          <span className="ts-result-name">{r.assertion}</span>
                          {!r.passed && <span className="ts-result-msg">{r.message}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {liveRun && (
                  <div className="ts-run-result">
                    <div className="ts-run-header">
                      <span style={{ color: statusColor(liveRun.status), fontWeight: 700 }}>
                        {liveRun.status.toUpperCase()}
                      </span>
                      <span className="ts-run-meta">
                        {liveRun.results.filter((r) => r.passed).length} / {liveRun.results.length} passed
                      </span>
                    </div>
                    <ul className="ts-results-list">
                      {liveRun.results.map((r, i) => (
                        <li key={i} className={`ts-result-item ${r.passed ? 'passed' : 'failed'}`}>
                          <span className="ts-result-icon">{r.passed ? '✓' : '✗'}</span>
                          <span className="ts-result-name">{r.assertion}</span>
                          {!r.passed && <span className="ts-result-msg">{r.message}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* История предыдущих запусков */}
                {runs.length > 0 && (
                  <div className="ts-runs-history">
                    <h4>{t('previousRuns', 'Previous runs')}</h4>
                    {runs.map((run) => (
                      <div key={run.id} className="ts-run-card">
                        <div className="ts-run-card-header">
                          <span style={{ color: statusColor(run.status), fontWeight: 600 }}>
                            {run.status.toUpperCase()}
                          </span>
                          <span className="ts-run-meta">
                            {run.results.filter((r) => r.passed).length}/{run.results.length} passed
                          </span>
                          <span className="ts-run-date">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <ul className="ts-results-list">
                          {run.results.map((r, i) => (
                            <li key={i} className={`ts-result-item ${r.passed ? 'passed' : 'failed'}`}>
                              <span className="ts-result-icon">{r.passed ? '✓' : '✗'}</span>
                              <span className="ts-result-name">{r.assertion}</span>
                              {!r.passed && <span className="ts-result-msg">{r.message}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {!lastResult && runs.length === 0 && (
                  <p className="empty-state">{t('noRunsYet', 'No runs yet. Click ▶ Run to execute the script.')}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="ts-editor empty-state">
            {t('selectOrCreateScript', 'Select a script or create a new one')}
          </div>
        )}
      </div>
    </div>
  );
}
