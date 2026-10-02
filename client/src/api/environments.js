import api from './client.js';

export const getEnvironments = () => api.get('/environments');
export const getEnvironment = (id) => api.get(`/environments/${id}`);
export const createEnvironment = (data) => api.post('/environments', data);
export const updateEnvironment = (id, data) => api.put(`/environments/${id}`, data);
export const deleteEnvironment = (id) => api.delete(`/environments/${id}`);
