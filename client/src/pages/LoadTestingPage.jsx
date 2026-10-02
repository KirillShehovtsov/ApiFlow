import { useMemo, useRef, useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import useAppStore from '../store/appStore.js';
import { startLoadTest, getLoadTestStatus, getLoadTestReport, getLoadTestHistory } from '../api/loadtests.js';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

export default function LoadTestingPage() {
  const { t } = useI18n();
  const { activeRequest, activeEnvironmentId } = useAppStore();
  const [form, setForm] = useState({
    totalRequests: 200,
    concurrency: 20,
    timeoutMs: 10000,
    durationMs: 0,
    intervalMs: 0,
  });
  const [jobId, setJobId] = useState(null);
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);

  const canRun = Boolean(activeRequest?.url && activeRequest?.method);

  const summary = useMemo(
    () => ({
      method: activeRequest?.method || 'GET',
      url: activeRequest?.url || '',
    }),
    [activeRequest]
  );

  // Загружаем историю при монтировании
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getLoadTestHistory(10);
      setHistory(res.data.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const connectWs = (nextJobId) => {
    wsRef.current?.close();
    const token = localStorage.getItem('token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/load-tests?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', jobId: String(nextJobId) }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'load-test:update' && String(data.jobId) === String(nextJobId)) {
          setStats(data.payload);
          if (data.payload.state === 'completed' || data.payload.state === 'failed') {
            setRunning(false);
            // Загружаем полный отчёт после завершения
            loadReport(nextJobId);
            loadHistory();
          }
        }
      } catch {
        // ignore malformed ws payload
      }
    };
    ws.onerror = () => {
      // fallback polling is enough, no noisy errors
    };
  };

  const loadReport = async (jobId) => {
    try {
      const res = await getLoadTestReport(jobId);
      setReport(res.data.data);
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  };

  const handleRun = async () => {
    if (!canRun) {
      showToast(t('selectRequestFirst', 'Select or open a request first'), 'error');
      return;
    }

    setRunning(true);
    setReport(null);
    setShowReport(false);
    setStats({
      state: 'queued',
      progress: 0,
      completed: 0,
      totalRequests: Number(form.totalRequests),
      success: 0,
      failed: 0,
      avg: 0,
      p95: 0,
      rps: 0,
    });

    try {
      const payload = {
        request: {
          method: activeRequest.method,
          url: activeRequest.url,
          headers: activeRequest.headers || {},
          queryParams: activeRequest.queryParams || {},
          body: activeRequest.body || undefined,
        },
        environmentId: activeEnvironmentId || null,
        options: {
          totalRequests: Number(form.totalRequests),
          concurrency: Number(form.concurrency),
          timeoutMs: Number(form.timeoutMs),
          durationMs: Number(form.durationMs),
          intervalMs: Number(form.intervalMs),
        },
      };
      const res = await startLoadTest(payload);
      const nextJobId = res.data.data.jobId;
      setJobId(nextJobId);
      connectWs(nextJobId);

      // Быстрый fallback на случай потери ws
      const poll = async () => {
        const statusRes = await getLoadTestStatus(nextJobId);
        const next = statusRes.data.data;
        setStats(next);
        if (next.state === 'completed' || next.state === 'failed') {
          setRunning(false);
          loadReport(nextJobId);
          loadHistory();
          return;
        }
        setTimeout(poll, 2000);
      };
      setTimeout(poll, 2200);
    } catch (err) {
      setRunning(false);
      showToast(err.response?.data?.message || t('failedStartLoadTest', 'Failed to start load test'), 'error');
    }
  };

  const handleViewReport = () => {
    setShowReport(!showReport);
  };

  const handleExportReport = () => {
    if (!report) return;
    
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `load-test-report-${report.jobId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(t('reportExported', 'Report exported successfully'), 'success');
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="page-content load-page">
        <div className="load-header">
          <h1>{t('loadTesting', 'Load Testing')}</h1>
          <p>{t('loadTestingDescription', 'Run concurrent requests and track avg, p95 and RPS in real time.')}</p>
        </div>

        <div className="load-card">
          <div className="load-request-preview">
            <span className={`load-method load-method-${summary.method}`}>{summary.method}</span>
            <span className="load-url">{summary.url || t('noRequestSelected', 'No request selected')}</span>
          </div>

          <div className="load-form-grid">
            <label>
              {t('totalRequests', 'Total requests')}
              <input
                type="number"
                min="1"
                max="5000"
                value={form.totalRequests}
                onChange={(e) => setForm((s) => ({ ...s, totalRequests: e.target.value }))}
              />
            </label>
            <label>
              {t('concurrency', 'Concurrency')}
              <input
                type="number"
                min="1"
                max="200"
                value={form.concurrency}
                onChange={(e) => setForm((s) => ({ ...s, concurrency: e.target.value }))}
              />
            </label>
            <label>
              {t('timeoutMs', 'Timeout (ms)')}
              <input
                type="number"
                min="100"
                max="60000"
                value={form.timeoutMs}
                onChange={(e) => setForm((s) => ({ ...s, timeoutMs: e.target.value }))}
              />
            </label>
            <label>
              {t('durationMs', 'Duration (ms)')}
              <input
                type="number"
                min="0"
                max="3600000"
                value={form.durationMs}
                onChange={(e) => setForm((s) => ({ ...s, durationMs: e.target.value }))}
              />
            </label>
            <label>
              {t('intervalBetweenBatchesMs', 'Interval between batches (ms)')}
              <input
                type="number"
                min="0"
                max="60000"
                value={form.intervalMs}
                onChange={(e) => setForm((s) => ({ ...s, intervalMs: e.target.value }))}
              />
            </label>
          </div>

          <div className="load-actions">
            <button className="btn-primary" onClick={handleRun} disabled={running || !canRun}>
              {running ? t('running', 'Running...') : t('startLoadTest', 'Start load test')}
            </button>
            {jobId && <span className="load-job-id">{t('job', 'Job')}: {jobId}</span>}
          </div>
        </div>

        {stats && (
          <div className="load-metrics">
            <div className="load-progress">
              <div className="load-progress-bar" style={{ width: `${Math.min(100, stats.progress || 0)}%` }} />
            </div>
            <div className="load-progress-text">
              {stats.state || t('queued', 'queued')} • {stats.completed || 0}/{stats.totalRequests || 0}
            </div>

            <div className="load-metric-grid">
              <Metric label={t('avg', 'Avg')} value={`${stats.avg ?? 0} ms`} />
              <Metric label={t('p95', 'P95')} value={`${stats.p95 ?? 0} ms`} />
              <Metric label="RPS" value={String(stats.rps ?? 0)} />
              <Metric label={t('success', 'Success')} value={String(stats.success ?? 0)} />
              <Metric label={t('failed', 'Failed')} value={String(stats.failed ?? 0)} />
            </div>

            {/* Кнопки для просмотра отчёта */}
            {stats.state === 'completed' && report && (
              <div className="load-report-actions">
                <button className="btn-secondary" onClick={handleViewReport}>
                  {showReport ? t('hideReport', 'Hide Report') : t('viewFullReport', 'View Full Report')}
                </button>
                <button className="btn-secondary" onClick={handleExportReport}>
                  {t('exportReportJson', 'Export Report (JSON)')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Полный отчёт */}
        {showReport && report && (
          <div className="load-report">
            <h2>{t('loadTestReport', 'Load Test Report')}</h2>
            
            <div className="report-section">
              <h3>{t('summary', 'Summary')}</h3>
              <div className="report-grid">
                <div className="report-item">
                  <span className="report-label">{t('totalRequests', 'Total Requests')}:</span>
                  <span className="report-value">{report.summary.totalRequests}</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('successful', 'Successful')}:</span>
                  <span className="report-value report-success">{report.summary.successful}</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('failed', 'Failed')}:</span>
                  <span className="report-value report-failed">{report.summary.failed}</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('successRate', 'Success Rate')}:</span>
                  <span className="report-value">{report.summary.successRate}%</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('totalDuration', 'Total Duration')}:</span>
                  <span className="report-value">{report.summary.totalDurationSec}s</span>
                </div>
              </div>
            </div>

            <div className="report-section">
              <h3>{t('performanceMetrics', 'Performance Metrics')}</h3>
              <div className="report-grid">
                <div className="report-item">
                  <span className="report-label">{t('avgResponseTime', 'Average Response Time')}:</span>
                  <span className="report-value">{report.performance.avgResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('minResponseTime', 'Min Response Time')}:</span>
                  <span className="report-value">{report.performance.minResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('maxResponseTime', 'Max Response Time')}:</span>
                  <span className="report-value">{report.performance.maxResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('medianResponseTime', 'Median Response Time')}:</span>
                  <span className="report-value">{report.performance.medianResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('p95ResponseTime', 'P95 Response Time')}:</span>
                  <span className="report-value">{report.performance.p95ResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('p99ResponseTime', 'P99 Response Time')}:</span>
                  <span className="report-value">{report.performance.p99ResponseTime} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('stdDeviation', 'Std Deviation')}:</span>
                  <span className="report-value">{report.performance.stdDev} ms</span>
                </div>
                <div className="report-item">
                  <span className="report-label">{t('requestsPerSecond', 'Requests/Second')}:</span>
                  <span className="report-value">{report.performance.requestsPerSecond}</span>
                </div>
              </div>
            </div>

            <div className="report-section">
              <h3>{t('statusCodesDistribution', 'Status Codes Distribution')}</h3>
              <div className="report-grid">
                {Object.entries(report.statusCodes || {}).map(([code, count]) => (
                  <div key={code} className="report-item">
                    <span className="report-label">{t('status', 'Status')} {code}:</span>
                    <span className="report-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {report.errors && report.errors.length > 0 && (
              <div className="report-section">
                <h3>{t('errors', 'Errors')} ({report.errorsCount || report.errors.length})</h3>
                <div className="report-errors">
                  {report.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="report-error-item">
                      <span className="error-request">{t('request', 'Request')} #{error.request}:</span>
                      <span className="error-message">{error.error}</span>
                      <span className="error-duration">({error.durationMs}ms)</span>
                    </div>
                  ))}
                  {report.errors.length > 10 && (
                    <div className="report-more-errors">
                      ... {t('andMoreErrors', 'and')} {report.errors.length - 10} {t('moreErrors', 'more errors')}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="report-section">
              <h3>{t('requestDetails', 'Request Details')}</h3>
              <div className="report-request-details">
                <div className="report-item">
                  <span className="report-label">{t('method', 'Method')}:</span>
                  <span className="report-value">{report.request.method}</span>
                </div>
                <div className="report-item">
                  <span className="report-label">URL:</span>
                  <span className="report-value report-url">{report.request.url}</span>
                </div>
              </div>
            </div>

            <div className="report-timestamp">
              <span>{t('testCompletedAt', 'Test completed at')}: {new Date(report.timestamp).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* История нагрузочных тестов */}
        {history.length > 0 && !running && (
          <div className="load-history">
            <h2>{t('recentLoadTests', 'Recent Load Tests')}</h2>
            <div className="history-list">
              {history.map((item, index) => (
                <div key={item.jobId || index} className="history-item" onClick={() => {
                  setJobId(item.jobId);
                  loadReport(item.jobId);
                  setShowReport(true);
                }}>
                  <div className="history-job-id">{t('job', 'Job')} #{item.jobId}</div>
                  <div className="history-date">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="history-stats">
                    <span className="history-success">{item.summary.successful} {t('success', 'success')}</span>
                    <span className="history-failed">{item.summary.failed} {t('failed', 'failed')}</span>
                  </div>
                  <div className="history-rps">{item.performance.requestsPerSecond} RPS</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="load-metric-card">
      <div className="load-metric-label">{label}</div>
      <div className="load-metric-value">{value}</div>
    </div>
  );
}
