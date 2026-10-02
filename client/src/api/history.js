import api from './client.js';

export const getHistory = (limit = 50) => api.get(`/history?limit=${limit}`);
export const getHistoryItem = (id) => api.get(`/history/${id}`);
export const clearHistory = () => api.delete('/history/clear');
export const deleteHistoryItem = (id) => api.delete(`/history/${id}`);
