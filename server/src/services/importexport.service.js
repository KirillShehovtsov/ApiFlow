import prisma from '../config/db.js';

/**
 * Экспортирует коллекцию со всеми запросами в JSON-объект.
 * Формат совместим с импортом обратно в приложение.
 */
export const exportCollection = async (collectionId, userId) => {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: {
      requests: {
        include: { testScripts: true },
      },
    },
  });

  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }

  return {
    __apiflow_export: true,
    version: '1.0',
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      requests: collection.requests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        headers: r.headers,
        queryParams: r.queryParams,
        body: r.body,
        testScripts: r.testScripts.map((s) => ({
          name: s.name,
          code: s.code,
        })),
      })),
    },
  };
};

/**
 * Импортирует коллекцию из JSON-объекта.
 * Поддерживает два формата:
 *   1. Наш формат экспорта: { __apiflow_export: true, collection: { name, requests } }
 *   2. Упрощённый формат:   { name, requests: [{ name, method, url, ... }] }
 */
export const importCollection = async (userId, data) => {
  let collectionData;

  if (data.__apiflow_export && data.collection) {
    // Наш родной формат
    collectionData = data.collection;
  } else if (data.name && Array.isArray(data.requests)) {
    // Упрощённый формат — { name, requests: [...] }
    collectionData = data;
  } else if (data.info && data.item) {
    // Postman Collection v2 формат
    collectionData = convertPostman(data);
  } else {
    const err = new Error(
      'Unsupported format. Expected: { name, requests: [...] } or API Flow export file'
    );
    err.status = 400;
    throw err;
  }

  const { name, requests = [] } = collectionData;

  const collection = await prisma.collection.create({
    data: {
      name: name || 'Imported Collection',
      userId,
      requests: {
        create: requests.map((r) => ({
          name: r.name || 'Unnamed',
          method: (r.method || 'GET').toUpperCase(),
          url: r.url || '',
          headers: typeof r.headers === 'string' ? r.headers : JSON.stringify(r.headers || {}),
          queryParams: typeof r.queryParams === 'string' ? r.queryParams : JSON.stringify(r.queryParams || {}),
          body: r.body ? (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) : null,
          testScripts: r.testScripts?.length
            ? { create: r.testScripts.map((s) => ({ name: s.name, code: s.code })) }
            : undefined,
        })),
      },
    },
    include: { requests: true },
  });

  return collection;
};

/**
 * Конвертирует Postman Collection v2.x в наш формат.
 * Поддерживает базовые запросы (без папок).
 */
const convertPostman = (data) => {
  const flattenItems = (items) => {
    const result = [];
    for (const item of items) {
      if (item.request) {
        // Это запрос
        const req = item.request;
        const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';
        const headers = {};
        (req.header || []).forEach((h) => { if (h.key) headers[h.key] = h.value; });
        const queryParams = {};
        (req.url?.query || []).forEach((q) => { if (q.key) queryParams[q.key] = q.value; });
        result.push({
          name: item.name || 'Unnamed',
          method: req.method || 'GET',
          url: url.split('?')[0], // убираем query string — она уже в queryParams
          headers,
          queryParams,
          body: req.body?.raw || null,
        });
      } else if (item.item) {
        // Это папка — рекурсивно разворачиваем
        result.push(...flattenItems(item.item));
      }
    }
    return result;
  };

  return {
    name: data.info?.name || 'Postman Import',
    requests: flattenItems(data.item || []),
  };
};
