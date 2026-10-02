import api from './client.js';

// Выполнить HTTP-запрос через прокси-сервер
// environmentId — опциональный, если передан — подставляются переменные {{varName}}
export const executeRequest = (data) => api.post('/proxy/execute', data);
