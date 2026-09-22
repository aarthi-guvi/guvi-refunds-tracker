import axios from 'axios'

const apiBaseUrl = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:4000/api'
export const api = axios.create({ baseURL: apiBaseUrl })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guvi_refund_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('guvi_refund_token')
    window.location.assign('/login')
  }
  return Promise.reject(error)
})
