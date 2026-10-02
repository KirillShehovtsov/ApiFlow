import api from './client.js';

export const getRequestsByCollection = (collectionId) =>
  api.get(`/requests/collection/${collectionId}`);
export const getRequestById = (id) => api.get(`/requests/${id}`);
export const createRequest = (data) => api.post('/requests', data);
export const updateRequest = (id, data) => api.put(`/requests/${id}`, data);
export const deleteRequest = (id) => api.delete(`/requests/${id}`);
