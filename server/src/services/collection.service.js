import prisma from '../config/db.js';

// Получить все коллекции текущего пользователя
export const getAll = async (userId) => {
  return prisma.collection.findMany({
    where: { userId },
    include: {
      requests: {
        select: { id: true, name: true, method: true, url: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Создать новую коллекцию
export const create = async (userId, { name }) => {
  return prisma.collection.create({
    data: { name, userId },
  });
};

// Обновить название коллекции
export const update = async (id, userId, { name }) => {
  // Проверяем что коллекция принадлежит этому пользователю
  const collection = await prisma.collection.findFirst({ where: { id, userId } });
  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }

  return prisma.collection.update({
    where: { id },
    data: { name },
  });
};

// Удалить коллекцию (все запросы внутри удалятся каскадно)
export const remove = async (id, userId) => {
  const collection = await prisma.collection.findFirst({ where: { id, userId } });
  if (!collection) {
    const err = new Error('Collection not found');
    err.status = 404;
    throw err;
  }

  return prisma.collection.delete({ where: { id } });
};