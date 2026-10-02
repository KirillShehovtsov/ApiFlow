import { EventEmitter } from 'events';

const hub = new EventEmitter();
hub.setMaxListeners(1000);

/**
 * Паблиш обновления нагрузки для конкретного пользователя/задачи.
 */
export const publishLoadTestUpdate = (userId, jobId, payload) => {
  hub.emit('update', { userId, jobId, payload });
};

/**
 * Подписка на все обновления (используется ws-адаптером).
 */
export const onLoadTestUpdate = (listener) => {
  hub.on('update', listener);
  return () => hub.off('update', listener);
};

