import api from './client.js';

// Парсинг curl-строки в объект запроса
export const parseCurl = (curl) => api.post(
  '/curl/parse',
  { curl: String(curl || '').trim() },
  { headers: { 'Content-Type': 'application/json' } }
);
