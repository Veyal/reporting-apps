import axios from 'axios';

// Build API URL from environment variables or use default
const BACKEND_HOST = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '5001';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://${BACKEND_HOST}:${BACKEND_PORT}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { username: string; name: string; password: string }) =>
    api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

export const reportsAPI = {
  getReports: (params?: any) => api.get('/reports', { params }),
  getReport: (id: string) => api.get(`/reports/${id}`),
  createReport: (data: any) => api.post('/reports', data),
  updateReport: (id: string, data: any) => api.patch(`/reports/${id}`, data),
  deleteReport: (id: string) => api.delete(`/reports/${id}`),
  submitReport: (id: string) => api.post(`/reports/${id}/submit`),
  resolveReport: (id: string, data?: { resolution: string }) =>
    api.post(`/reports/${id}/resolve`, data || {}),
  updateChecklist: (reportId: string, checklistId: string, completed: boolean) =>
    api.post(`/reports/${reportId}/checklist/${checklistId}`, { completed }),
  getChecklistTemplates: (reportType: string) =>
    api.get(`/checklists/templates/${reportType}`),
  updateStock: (reportId: string, data: any) =>
    api.post(`/reports/${reportId}/stock`, data),
};

export const photosAPI = {
  getPhotos: (reportId: string, category?: string) =>
    api.get(`/photos/${reportId}`, { params: { category } }),
  uploadPhotos: (reportId: string, formData: FormData) =>
    api.post(`/photos/${reportId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (reportId: string, photoId: string) =>
    api.delete(`/photos/${reportId}/${photoId}`),
  getCategories: (reportType: string) =>
    api.get(`/photos/categories/${reportType}`),
};

export const adminAPI = {
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: string, data: any) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getChecklists: (params?: any) => api.get('/admin/checklists', { params }),
  createChecklist: (data: any) => api.post('/admin/checklists', data),
  updateChecklist: (id: string, data: any) =>
    api.patch(`/admin/checklists/${id}`, data),
  deleteChecklist: (id: string) => api.delete(`/admin/checklists/${id}`),
  updateChecklistOrder: (data: { id: string; order: number }[]) =>
    api.patch('/admin/checklists/reorder', { checklists: data }),
  getPhotoCategories: (params?: any) => api.get('/admin/photo-categories', { params }),
  createPhotoCategory: (data: any) => api.post('/admin/photo-categories', data),
  updatePhotoCategory: (id: string, data: any) =>
    api.patch(`/admin/photo-categories/${id}`, data),
  deletePhotoCategory: (id: string) => api.delete(`/admin/photo-categories/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getStats: (params?: any) => api.get('/admin/stats/summary', { params }),
};

export default api;
