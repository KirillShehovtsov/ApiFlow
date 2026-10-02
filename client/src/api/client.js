// Базовый axios-клиент
// Автоматически добавляет JWT-токен в каждый запрос и обрабатывает 401
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Перед каждым запросом берём токен из localStorage и вставляем в заголовок
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Если сервер вернул 401 — токен протух, чистим стор и редиректим на логин
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
