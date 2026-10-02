import prisma from '../config/db.js';
import { getVariablesMap } from './environment.service.js';

/**
 * Выполняет HTTP-запрос к внешнему API и сохраняет его в историю.
 * Если передан environmentId — подставляет переменные окружения вида {{varName}}
 * во все поля запроса перед отправкой.
 */
export const executeRequest = async (userId, { method, url, headers, queryParams, body, environmentId }) => {
  // Загружаем переменные окружения если указан environmentId
  let variables = {};
  if (environmentId) {
    variables = await getVariablesMap(parseInt(environmentId), userId);
  }

  // Подставляем переменные во все поля запроса
  const resolvedUrl = interpolate(url, variables);
  const resolvedHeaders = interpolateObject(headers || {}, variables);
  const resolvedQueryParams = interpolateObject(queryParams || {}, variables);
  const resolvedBody = body ? interpolate(
    typeof body === 'string' ? body : JSON.stringify(body),
    variables
  ) : undefined;

  // Подставляем query parameters в URL
  // Если URL невалидный (например переменная не подставилась) — возвращаем понятную ошибку
  let fullUrl;
  try {
    fullUrl = buildUrl(resolvedUrl, resolvedQueryParams);
  } catch {
    const result = {
      status: null,
      body: { error: `Invalid URL: "${resolvedUrl}". Check that all {{variables}} are substituted and the environment is selected.` },
      headers: {},
      durationMs: 0,
    };
    await saveHistory(userId, { method, url: resolvedUrl, headers: {}, body }, result);
    return result;
  }

  // Формируем заголовки (уже с подставленными переменными)
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...resolvedHeaders,
  };

  // Фиксируем время начала запроса
  const startTime = Date.now();

  let responseStatus;
  let responseBody;
  let responseHeaders;

  try {
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: requestHeaders,
    };

    // Body только для методов которые его поддерживают
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && resolvedBody) {
      fetchOptions.body = resolvedBody;
    }

    const response = await fetch(fullUrl, fetchOptions);

    responseStatus = response.status;
    responseHeaders = Object.fromEntries(response.headers.entries());

    // Пробуем распарсить как JSON, если не получается — берём как текст
    const text = await response.text();
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  } catch (err) {
    // Сетевая ошибка (недоступный хост, таймаут и т.д.)
    const durationMs = Date.now() - startTime;
    const errorResult = {
      status: null,
      body: { error: err.message },
      headers: {},
      durationMs,
    };

    // Сохраняем в историю даже неудачные запросы
    await saveHistory(userId, { method, url: fullUrl, headers: requestHeaders, body }, errorResult);
    return errorResult;
  }

  const durationMs = Date.now() - startTime;

  const result = {
    status: responseStatus,
    body: responseBody,
    headers: responseHeaders,
    durationMs,
  };

  // Сохраняем успешный запрос в историю
  await saveHistory(userId, { method, url: fullUrl, headers: requestHeaders, body }, result);

  return result;
};

// --- Вспомогательные функции ---

const buildUrl = (url, queryParams) => {
  const urlObj = new URL(url);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (key && value) urlObj.searchParams.append(key, value);
  });
  return urlObj.toString();
};

const saveHistory = async (userId, requestData, responseData) => {
  await prisma.requestHistory.create({
    data: {
      userId,
      requestData: JSON.stringify(requestData),
      responseData: JSON.stringify(responseData),
      durationMs: responseData.durationMs,
    },
  });
};

/**
 * Заменяет {{varName}} на значение из объекта variables.
 * Если переменная не найдена — оставляет плейсхолдер как есть.
 */
export const interpolate = (str, variables) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
};

/**
 * Применяет interpolate ко всем значениям объекта (headers, queryParams).
 * Фильтрует пустые ключи — они вызывают ошибку в fetch Headers.append
 */
export const interpolateObject = (obj, variables) => {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => key && key.trim() !== '')   // убираем пустые ключи
      .map(([key, value]) => [key.trim(), interpolate(value, variables)])
  );
};