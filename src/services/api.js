import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Simple request queue to space outgoing requests and avoid overloading
// a constrained backend (e.g. low-CPU DB). Interval can be configured via
// `VITE_API_REQUEST_INTERVAL_MS` (milliseconds). Default: 200ms.
const REQUEST_INTERVAL_MS = Number(import.meta.env.VITE_API_REQUEST_INTERVAL_MS) || 200
let _pendingQueue = Promise.resolve()
function enqueueDelay() {
  let resolver
  const p = new Promise((res) => { resolver = res })
  const scheduled = _pendingQueue.then(() => p)
  // advance the queue: next calls will wait for `scheduled` to resolve
  _pendingQueue = scheduled
  setTimeout(resolver, REQUEST_INTERVAL_MS)
  return scheduled
}

// Timeout and retry configuration
api.defaults.timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000
const MAX_RETRIES = Number(import.meta.env.VITE_API_MAX_RETRIES) || 2

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Allow opt-out for requests that must not be queued (refresh token, health checks, etc.)
  if (config && config.skipQueue) return config

  // If URL looks like the refresh endpoint, skip queue to avoid deadlocks
  const url = config.url || ''
  if (url.includes('/authentication/token/refresh')) return config

  // Wait for our scheduled slot before sending request
  return enqueueDelay().then(() => config)
})

// Response interceptor with retry/backoff and 401 refresh handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (!original) return Promise.reject(error)

    // Don't retry requests that explicitly opt-out
    if (original.skipRetry) return Promise.reject(error)

    const status = error.response?.status

    // Retry on network errors or 5xx
    const shouldRetry = !error.response || (status >= 500 && status < 600)
    original._retryCount = original._retryCount || 0
    if (shouldRetry && original._retryCount < MAX_RETRIES) {
      original._retryCount += 1
      const delay = Math.pow(2, original._retryCount) * 200
      await new Promise((res) => setTimeout(res, delay))
      return api(original)
    }

    // Handle 401: try refresh once (skip queue for refresh)
    if (status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await api.post('/authentication/token/refresh/', { refresh }, { skipQueue: true, skipRetry: true })
        const { data } = await api.post('/authentication/token/refresh/', { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
