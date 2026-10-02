import api from './client.js';

export const getScriptsByRequest = (requestId) => api.get(`/test-scripts/request/${requestId}`);
export const getScript = (id) => api.get(`/test-scripts/${id}`);
export const createScript = (data) => api.post('/test-scripts', data);
export const updateScript = (id, data) => api.put(`/test-scripts/${id}`, data);
export const deleteScript = (id) => api.delete(`/test-scripts/${id}`);
export const runScript = (id, responseData) => api.post(`/test-scripts/${id}/run`, responseData);
export const getScriptRuns = (id) => api.get(`/test-scripts/${id}/runs`);
