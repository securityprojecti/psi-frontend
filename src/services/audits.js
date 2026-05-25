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
      const payload = {
        audit: answer.audit,
        control: answer.control,
        status: answer.status,
        ...(answer.work_in_progress ? { work_in_progress: true } : {}),
      }
      try {
        await api.post('/answers/', payload)
      } catch (error) {
        console.error('Answer bulkCreate failed for payload:', payload, error.response?.data || error.message)
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  },
  update: (id, data) => api.patch(`/answers/${id}/`, data),
  create: (data) => api.post('/answers/', data),
}
