import api from './api'

export const auditsService = {
  list: (params) => api.get('/audits/', { params }),
  get: (id) => api.get(`/audits/${id}/`),
  create: (data) => api.post('/audits/', data),
  remove: (id) => api.delete(`/audits/${id}/`),
}

export const controlsService = {
  list: (params) => api.get('/controls/', { params }),
}

export const answersService = {
  list: (params) => api.get('/answers/', { params }),
  bulkUpdate: (answers) =>
    Promise.all(
      answers.map((a) =>
        a.id
          ? api.patch(`/answers/${a.id}/`, a)
          : api.post('/answers/', a)
      )
    ),
  bulkCreate: async (answers) => {
    for (const answer of answers) {
      await api.post('/answers/', answer)
    }
  },
  update: (id, data) => api.patch(`/answers/${id}/`, data),
  create: (data) => api.post('/answers/', data),
}
