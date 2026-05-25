import api from './api'

export const companiesService = {
  list: () => api.get('/companies/'),
  get: (id) => api.get(`/companies/${id}/`),
  create: (data) => api.post('/companies/', data),
  update: (id, data) => api.put(`/companies/${id}/`, data),
  remove: (id) => api.delete(`/companies/${id}/`),
}
