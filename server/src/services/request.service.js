import prisma from '../config/db.js';

// Получить все запросы в коллекции
export const getByCollection = async (collectionId, userId) => {
  // Проверяем что коллекция принадлежит пользователю
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }

  return prisma.request.findMany({
    where: { collectionId },
    orderBy: { createdAt: 'desc' },
  });
};

// Получить один запрос по id
export const getById = async (id, userId) => {
  const request = await prisma.request.findFirst({
    where: { id, collection: { userId } },
    include: { testScripts: true },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  return request;
};

// Создать запрос в коллекции
export const create = async (userId, { name, method, url, headers, queryParams, body, collectionId }) => {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }

  return prisma.request.create({
    data: {
      name,
      method,
      url,
      headers: JSON.stringify(headers || {}),
      queryParams: JSON.stringify(queryParams || {}),
      body: body ? JSON.stringify(body) : null,
      collectionId,
    },
  });
};

// Обновить запрос
export const update = async (id, userId, data) => {
  const request = await prisma.request.findFirst({
    where: { id, collection: { userId } },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  return prisma.request.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.method && { method: data.method }),
      ...(data.url && { url: data.url }),
      ...(data.headers && { headers: JSON.stringify(data.headers) }),
      ...(data.queryParams && { queryParams: JSON.stringify(data.queryParams) }),
      ...(data.body !== undefined && { body: data.body ? JSON.stringify(data.body) : null }),
    },
  });
};

// Удалить запрос
export const remove = async (id, userId) => {
  const request = await prisma.request.findFirst({
    where: { id, collection: { userId } },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  return prisma.request.delete({ where: { id } });
};
