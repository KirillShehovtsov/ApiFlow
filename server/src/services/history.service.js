import prisma from '../config/db.js';

// Получить историю запросов текущего пользователя
export const getAll = async (userId, limit = 50) => {
  const history = await prisma.requestHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit, // последние N записей
  });

  // Парсим JSON строки обратно в объекты
  return history.map((item) => ({
    ...item,
    requestData: JSON.parse(item.requestData),
    responseData: JSON.parse(item.responseData),
  }));
};

// Получить одну запись истории
export const getById = async (id, userId) => {
  const item = await prisma.requestHistory.findFirst({
    where: { id, userId },
  });

  if (!item) {
    const err = new Error('History item not found');
    err.status = 404;
    throw err;
  }

  return {
    ...item,
    requestData: JSON.parse(item.requestData),
    responseData: JSON.parse(item.responseData),
  };
};

// Очистить всю историю пользователя
export const clear = async (userId) => {
  return prisma.requestHistory.deleteMany({ where: { userId } });
};

// Удалить одну запись
export const remove = async (id, userId) => {
  const item = await prisma.requestHistory.findFirst({ where: { id, userId } });

  if (!item) {
    const err = new Error('History item not found');
    err.status = 404;
    throw err;
  }

  return prisma.requestHistory.delete({ where: { id } });
};