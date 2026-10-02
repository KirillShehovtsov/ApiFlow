import { MemoryQueue, MemoryWorker } from './queue.memory.js';
import { getVariablesMap } from './environment.service.js';
import { publishLoadTestUpdate } from './loadtest.hub.js';
import prisma from '../config/db.js';

const QUEUE_NAME = 'apiflow-load-tests';

// In-memory очередь вместо Redis + BullMQ
const queue = new MemoryQueue(QUEUE_NAME);
const lastStatsByJob = new Map();
const jobReports = new Map(); // Хранилище отчётов

const emitProgress = (userId, jobId, stats) => {
  lastStatsByJob.set(jobId, stats);
  publishLoadTestUpdate(userId, jobId, stats);
};

const computeP95 = (durations) => {
  if (!durations.length) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
};

const computeP99 = (durations) => {
  if (!durations.length) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.99) - 1);
  return sorted[idx];
};

const computeMedian = (durations) => {
  if (!durations.length) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const computeMin = (durations) => {
  if (!durations.length) return 0;
  return Math.min(...durations);
};

const computeMax = (durations) => {
  if (!durations.length) return 0;
  return Math.max(...durations);
};

const computeStdDev = (durations) => {
  if (!durations.length) return 0;
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const squareDiffs = durations.map((d) => Math.pow(d - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, d) => sum + d, 0) / durations.length;
  return Math.round(Math.sqrt(avgSquareDiff));
};

const interpolate = (str, variables) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in variables ? variables[key] : match));
};

const interpolateObject = (obj, variables) =>
  Object.fromEntries(
    Object.entries(obj || {})
      .filter(([k]) => k && k.trim() !== '')
      .map(([k, v]) => [k.trim(), interpolate(v, variables)])
  );

const buildUrl = (url, queryParams) => {
  const urlObj = new URL(url);
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (key && value !== undefined && value !== null && value !== '') {
      urlObj.searchParams.append(key, String(value));
    }
  });
  return urlObj.toString();
};

const runSingleRequest = async ({ method, url, headers, body, timeoutMs }) => {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? body : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return { 
      ok: response.ok, 
      status: response.status, 
      durationMs: Date.now() - startedAt,
      error: null 
    };
  } catch (error) {
    return { 
      ok: false, 
      status: null, 
      durationMs: Date.now() - startedAt,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Создаём worker для обработки задач нагрузочного тестирования
const createWorker = () => {
  const worker = new MemoryWorker(QUEUE_NAME, async (job) => {
    const {
      userId,
      request,
      options: { totalRequests, concurrency, timeoutMs, durationMs, intervalMs },
      environmentId,
    } = job.data;

    let variables = {};
    if (environmentId) {
      variables = await getVariablesMap(parseInt(environmentId), userId);
    }

    const resolvedMethod = request.method || 'GET';
    const resolvedHeaders = {
      'Content-Type': 'application/json',
      ...interpolateObject(request.headers || {}, variables),
    };
    const resolvedQuery = interpolateObject(request.queryParams || {}, variables);
    const resolvedBody = request.body
      ? interpolate(typeof request.body === 'string' ? request.body : JSON.stringify(request.body), variables)
      : undefined;
    const resolvedUrl = buildUrl(interpolate(request.url, variables), resolvedQuery);

    const durations = [];
    const errors = [];
    const statusCodes = {};
    let completed = 0;
    let success = 0;
    let failed = 0;
    const startedAt = Date.now();

    emitProgress(userId, job.id, {
      state: 'running',
      progress: 0,
      completed,
      totalRequests,
      success,
      failed,
      avg: 0,
      p95: 0,
      rps: 0,
    });

    const deadline = durationMs > 0 ? startedAt + durationMs : null;

    // Выполняем запросы батчами
    for (let sent = 0; sent < totalRequests; sent += concurrency) {
      if (deadline && Date.now() >= deadline) break;
      const batch = Math.min(concurrency, totalRequests - sent);
      const tasks = Array.from({ length: batch }, () =>
        runSingleRequest({
          method: resolvedMethod,
          url: resolvedUrl,
          headers: resolvedHeaders,
          body: resolvedBody,
          timeoutMs,
        })
      );

      const results = await Promise.all(tasks);
      for (const result of results) {
        completed += 1;
        durations.push(result.durationMs);
        
        // Собираем статистику по статус-кодам
        const statusCode = result.status || 'error';
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
        
        // Собираем ошибки
        if (result.error) {
          errors.push({
            request: completed,
            error: result.error,
            durationMs: result.durationMs
          });
        }
        
        if (result.ok) success += 1;
        else failed += 1;
      }

      const elapsedSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
      const avg = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
      const p95 = computeP95(durations);
      const rps = Number((completed / elapsedSec).toFixed(2));
      const progress = Math.round((completed / totalRequests) * 100);

      const stats = { state: 'running', progress, completed, totalRequests, success, failed, avg, p95, rps };
      await queue.updateProgress(job.id, stats);
      emitProgress(userId, job.id, stats);

      if (intervalMs > 0 && completed < totalRequests) {
        await sleep(intervalMs);
      }
    }

    const elapsedSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
    const totalTimeMs = Date.now() - startedAt;
    
    // Генерируем полный отчёт
    const finalStats = {
      state: 'completed',
      progress: 100,
      completed,
      totalRequests,
      success,
      failed,
      avg: Math.round(durations.reduce((sum, d) => sum + d, 0) / Math.max(1, durations.length)),
      p95: computeP95(durations),
      rps: Number((completed / elapsedSec).toFixed(2)),
    };
    
    const report = {
      jobId: job.id,
      userId,
      request: {
        method: resolvedMethod,
        url: resolvedUrl,
        headers: resolvedHeaders,
        body: resolvedBody,
      },
      options: {
        totalRequests,
        concurrency,
        timeoutMs,
        durationMs,
        intervalMs,
      },
      environmentId,
      summary: {
        totalRequests,
        successful: success,
        failed,
        successRate: Number(((success / totalRequests) * 100).toFixed(2)),
        totalDurationMs: totalTimeMs,
        totalDurationSec: Number((totalTimeMs / 1000).toFixed(3)),
      },
      performance: {
        avgResponseTime: Math.round(durations.reduce((sum, d) => sum + d, 0) / Math.max(1, durations.length)),
        minResponseTime: computeMin(durations),
        maxResponseTime: computeMax(durations),
        medianResponseTime: Math.round(computeMedian(durations)),
        p95ResponseTime: computeP95(durations),
        p99ResponseTime: computeP99(durations),
        stdDev: computeStdDev(durations),
        requestsPerSecond: Number((completed / elapsedSec).toFixed(2)),
      },
      statusCodes,
      errors: errors.slice(0, 100), // Ограничиваем количество ошибок в отчёте
      errorsCount: errors.length,
      timestamp: new Date().toISOString(),
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    // Сохраняем отчёт в память
    jobReports.set(job.id, report);
    
    // Сохраняем отчёт в базу данных
    try {
      await prisma.loadTestReport.create({
        data: {
          userId,
          jobId: job.id,
          requestData: JSON.stringify(report.request),
          summaryData: JSON.stringify(report.summary),
          performanceData: JSON.stringify(report.performance),
          statusCodes: JSON.stringify(report.statusCodes),
          errorsData: JSON.stringify(report.errors),
        }
      });
    } catch (error) {
      console.error('Failed to save load test report to database:', error);
      // Продолжаем даже если не удалось сохранить в БД
    }
    
    emitProgress(userId, job.id, finalStats);
    return finalStats;
  });
  
  worker.on('failed', (job, err) => {
    if (!job?.data?.userId) return;
    const stats = {
      ...(lastStatsByJob.get(job.id) || {}),
      state: 'failed',
      error: err.message,
    };
    emitProgress(job.data.userId, job.id, stats);
  });
  
  return worker;
};

// Инициализируем worker сразу
const worker = createWorker();

export const startLoadTest = async (userId, payload) => {
  const request = payload.request || {};
  const options = payload.options || {};
  
  if (!request.method || !request.url) {
    const err = new Error('request.method and request.url are required');
    err.status = 400;
    throw err;
  }

  const totalRequests = Math.max(1, Math.min(5000, parseInt(options.totalRequests || 100)));
  const concurrency = Math.max(1, Math.min(200, parseInt(options.concurrency || 10)));
  const timeoutMs = Math.max(100, Math.min(60000, parseInt(options.timeoutMs || 10000)));
  const durationMs = Math.max(0, Math.min(3600000, parseInt(options.durationMs || 0)));
  const intervalMs = Math.max(0, Math.min(60000, parseInt(options.intervalMs || 0)));

  const job = await queue.add(
    'run-load-test',
    {
      userId,
      request,
      environmentId: payload.environmentId || null,
      options: { totalRequests, concurrency, timeoutMs, durationMs, intervalMs },
    },
    { removeOnComplete: 50, removeOnFail: 50 }
  );

  return { jobId: job.id, totalRequests, concurrency, timeoutMs, durationMs, intervalMs };
};

export const getLoadTestStatus = async (userId, jobId) => {
  const job = await queue.getJob(jobId);
  
  if (!job) {
    const err = new Error('Load test job not found');
    err.status = 404;
    throw err;
  }
  
  if (job.data.userId !== userId) {
    const err = new Error('Access denied for this load test job');
    err.status = 403;
    throw err;
  }

  const state = await queue.getJobState(jobId);
  const progress = (typeof job.progress === 'object' ? job.progress : {}) || {};
  
  return {
    jobId,
    state,
    ...(lastStatsByJob.get(jobId) || progress || {}),
    result: job.returnValue || null,
    failedReason: job.failedReason || null,
  };
};

export const getLoadTestReport = async (userId, jobId) => {
  // Сначала проверяем в памяти
  let report = jobReports.get(jobId);
  
  // Если нет в памяти, пытаемся загрузить из базы
  if (!report) {
    const dbReport = await prisma.loadTestReport.findFirst({
      where: { userId, jobId }
    });
    
    if (dbReport) {
      report = {
        jobId: dbReport.jobId,
        userId: dbReport.userId,
        request: JSON.parse(dbReport.requestData),
        summary: JSON.parse(dbReport.summaryData),
        performance: JSON.parse(dbReport.performanceData),
        statusCodes: JSON.parse(dbReport.statusCodes),
        errors: JSON.parse(dbReport.errorsData),
        timestamp: dbReport.createdAt.toISOString(),
      };
    }
  }
  
  if (!report) {
    const err = new Error('Load test report not found');
    err.status = 404;
    throw err;
  }
  
  if (report.userId !== userId) {
    const err = new Error('Access denied for this load test report');
    err.status = 403;
    throw err;
  }
  
  return report;
};

export const getLoadTestHistory = async (userId, limit = 20) => {
  const reports = await prisma.loadTestReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  return reports.map(r => ({
    jobId: r.jobId,
    timestamp: r.createdAt.toISOString(),
    summary: JSON.parse(r.summaryData),
    performance: JSON.parse(r.performanceData),
  }));
};
