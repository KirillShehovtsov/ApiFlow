import api from './client.js';

export const startLoadTest = (data) => api.post('/load-tests/start', data);
export const getLoadTestStatus = (jobId) => api.get(`/load-tests/${jobId}`);
export const getLoadTestReport = (jobId) => api.get(`/load-tests/${jobId}/report`);
export const getLoadTestHistory = (limit = 20) => api.get(`/load-tests/history?limit=${limit}`);

