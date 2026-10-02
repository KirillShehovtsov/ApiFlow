import prisma from '../config/db.js';

// Получить все окружения пользователя (с переменными)
export const getAll = async (userId) => {
  return prisma.environment.findMany({
    where: { userId },
    include: { variables: true },
    orderBy: { createdAt: 'desc' },
  });
};

// Получить одно окружение по id
export const getById = async (id, userId) => {
  const env = await prisma.environment.findFirst({
    where: { id, userId },
    include: { variables: true },
  });

  if (!env) {
    const err = new Error('Environment not found');
    err.status = 404;
    throw err;
  }

  return env;
};

// Создать новое окружение
export const create = async (userId, { name, variables = [] }) => {
  return prisma.environment.create({
    data: {
      name,
      userId,
      // Создаём переменные сразу вместе с окружением
      variables: {
        create: variables.map(({ key, value }) => ({ key, value })),
      },
    },
    include: { variables: true },
  });
};

// Обновить название окружения и его переменные
// Стратегия: удаляем все старые переменные и создаём новые —
// это проще чем diff и достаточно для нашего случая
export const update = async (id, userId, { name, variables }) => {
  const env = await prisma.environment.findFirst({ where: { id, userId } });

  if (!env) {
    const err = new Error('Environment not found');
    err.status = 404;
    throw err;
  }

  return prisma.environment.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(variables && {
        variables: {
          // Удаляем все существующие переменные этого окружения
          deleteMany: { environmentId: id },
          // Создаём новый набор переменных
          create: variables.map(({ key, value }) => ({ key, value })),
        },
      }),
    },
    include: { variables: true },
  });
};

// Удалить окружение (переменные удалятся каскадно)
export const remove = async (id, userId) => {
  const env = await prisma.environment.findFirst({ where: { id, userId } });

  if (!env) {
    const err = new Error('Environment not found');
    err.status = 404;
    throw err;
  }

  return prisma.environment.delete({ where: { id } });
};

// Получить переменные окружения в виде плоского объекта { key: value }
// Используется в proxy-сервисе для подстановки {{variable}}
export const getVariablesMap = async (environmentId, userId) => {
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, userId },
    include: { variables: true },
  });

  if (!env) {
    const err = new Error('Environment not found');
    err.status = 404;
    throw err;
  }

  // Превращаем массив [{key, value}] в объект { key: value }
  return env.variables.reduce((map, { key, value }) => {
    map[key] = value;
    return map;
  }, {});
};
