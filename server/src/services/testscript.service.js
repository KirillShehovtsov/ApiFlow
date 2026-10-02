import prisma from '../config/db.js';
import { publishTestScriptUpdate } from './testscript.hub.js';

// ─── CRUD ────────────────────────────────────────────────────────────────────

// Получить все тест-скрипты запроса
export const getByRequest = async (requestId, userId) => {
  // Проверяем что запрос принадлежит пользователю
  const request = await prisma.request.findFirst({
    where: { id: requestId, collection: { userId } },
  });
  if (!request) {
    const err = new Error('Request not found'); err.status = 404; throw err;
  }
  return prisma.testScript.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } });
};

// Получить один скрипт
export const getById = async (id, userId) => {
  const script = await prisma.testScript.findFirst({
    where: { id, request: { collection: { userId } } },
    include: { runs: { orderBy: { createdAt: 'desc' }, take: 10, include: { results: true } } },
  });
  if (!script) {
    const err = new Error('Test script not found'); err.status = 404; throw err;
  }
  return script;
};

// Создать скрипт
export const create = async (userId, { requestId, name, code }) => {
  const request = await prisma.request.findFirst({
    where: { id: requestId, collection: { userId } },
  });
  if (!request) {
    const err = new Error('Request not found'); err.status = 404; throw err;
  }
  return prisma.testScript.create({ data: { name, code, requestId } });
};

// Обновить скрипт
export const update = async (id, userId, { name, code }) => {
  const script = await prisma.testScript.findFirst({
    where: { id, request: { collection: { userId } } },
  });
  if (!script) {
    const err = new Error('Test script not found'); err.status = 404; throw err;
  }
  return prisma.testScript.update({
    where: { id },
    data: { ...(name && { name }), ...(code !== undefined && { code }) },
  });
};

// Удалить скрипт
export const remove = async (id, userId) => {
  const script = await prisma.testScript.findFirst({
    where: { id, request: { collection: { userId } } },
  });
  if (!script) {
    const err = new Error('Test script not found'); err.status = 404; throw err;
  }
  return prisma.testScript.delete({ where: { id } });
};

// ─── Выполнение ──────────────────────────────────────────────────────────────

/**
 * Выполняет тест-скрипт против переданного ответа сервера.
 *
 * Скрипт получает объект `pm` (аналог Postman):
 *   pm.response.status      — HTTP статус-код
 *   pm.response.body        — тело ответа (объект или строка)
 *   pm.response.headers     — заголовки ответа
 *   pm.response.time        — время ответа в мс
 *   pm.test(name, fn)       — объявить тест
 *   pm.expect(val)          — chai-style ассерты
 *
 * Возвращает { status, results: [{ assertion, passed, message }] }
 */
export const run = async (id, userId, responseData) => {
  const script = await prisma.testScript.findFirst({
    where: { id, request: { collection: { userId } } },
  });
  if (!script) {
    const err = new Error('Test script not found'); err.status = 404; throw err;
  }

  const results = [];
  const testRun = await prisma.testRun.create({
    data: {
      testScriptId: id,
      status: 'running',
    },
  });
  publishTestScriptUpdate(userId, id, {
    event: 'started',
    runId: testRun.id,
    status: 'running',
  });

  // Объект pm — API для написания тестов
  const pm = buildPmObject(responseData, results, (result) => {
    publishTestScriptUpdate(userId, id, {
      event: 'progress',
      runId: testRun.id,
      status: 'running',
      result,
      results,
    });
  });

  try {
    // Выполняем код скрипта в изолированной функции
    // eslint-disable-next-line no-new-func
    const fn = new Function('pm', script.code);
    fn(pm);
  } catch (err) {
    // Ошибка синтаксиса или рантайм — добавляем как упавший тест
    results.push({ assertion: 'Script execution', passed: false, message: err.message });
  }

  // Определяем общий статус: passed если все тесты прошли
  const allPassed = results.length > 0 && results.every((r) => r.passed);
  const status = allPassed ? 'passed' : results.length === 0 ? 'empty' : 'failed';

  // Сохраняем результат запуска в БД
  if (results.length) {
    await prisma.testResult.createMany({
      data: results.map((r) => ({
        runId: testRun.id,
        assertion: r.assertion,
        passed: r.passed,
        message: r.message || null,
      })),
    });
  }
  await prisma.testRun.update({
    where: { id: testRun.id },
    data: { status },
  });
  publishTestScriptUpdate(userId, id, {
    event: 'completed',
    runId: testRun.id,
    status,
    results,
  });

  return { runId: testRun.id, status, results };
};

// Получить историю запусков скрипта
export const getRuns = async (id, userId) => {
  const script = await prisma.testScript.findFirst({
    where: { id, request: { collection: { userId } } },
  });
  if (!script) {
    const err = new Error('Test script not found'); err.status = 404; throw err;
  }
  return prisma.testRun.findMany({
    where: { testScriptId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { results: true },
  });
};

// ─── Вспомогательные ─────────────────────────────────────────────────────────

/**
 * Строит объект pm с API для тестов.
 * results — массив куда пушатся результаты тестов.
 */
const buildPmObject = (responseData, results, onResult) => {
  const { status, body, headers, durationMs } = responseData;

  // pm.expect — минимальный chai-style
  const expect = (actual) => ({
    // Равенство
    to: {
      equal: (expected) => {
        if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      },
      be: {
        below: (n) => { if (actual >= n) throw new Error(`Expected ${actual} to be below ${n}`); },
        above: (n) => { if (actual <= n) throw new Error(`Expected ${actual} to be above ${n}`); },
        a: (type) => { if (typeof actual !== type) throw new Error(`Expected ${typeof actual} to be ${type}`); },
      },
      include: (val) => {
        const str = typeof actual === 'string' ? actual : JSON.stringify(actual);
        if (!str.includes(val)) throw new Error(`Expected response to include "${val}"`);
      },
      have: {
        property: (key) => {
          if (typeof actual !== 'object' || actual === null || !(key in actual)) {
            throw new Error(`Expected object to have property "${key}"`);
          }
        },
        status: (code) => {
          if (actual !== code) throw new Error(`Expected status ${actual} to equal ${code}`);
        },
      },
    },
    // Отрицание
    not: {
      to: {
        equal: (expected) => {
          if (actual === expected) throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
        },
      },
    },
  });

  return {
    response: {
      status,
      body,
      headers,
      time: durationMs,
      // Хелпер для получения JSON-тела
      json: () => (typeof body === 'string' ? JSON.parse(body) : body),
    },

    // pm.test(name, fn) — основной способ объявить тест
    test: (name, fn) => {
      try {
        fn();
        results.push({ assertion: name, passed: true, message: null });
      } catch (err) {
        results.push({ assertion: name, passed: false, message: err.message });
      }
      onResult?.(results[results.length - 1]);
    },

    expect,
  };
};
