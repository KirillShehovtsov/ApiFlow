import api from './client.js';

export const getCollections = () => api.get('/collections');
export const createCollection = (data) => api.post('/collections', data);
export const updateCollection = (id, data) => api.put(`/collections/${id}`, data);
export const deleteCollection = (id) => api.delete(`/collections/${id}`);

// Экспорт — получаем JSON и скачиваем как файл
export const exportCollection = async (id, name) => {
  const res = await api.get(`/collections/${id}/export`);
  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'collection'}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Импорт — отправляем JSON-объект на сервер
export const importCollection = (data) => api.post('/collections/import', data);
