import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Get refresh token
const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

// Create axios instance
const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/stock`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for automatic token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          // Call refresh endpoint
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Store new tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const stockAPI = {
  // Initialize stock report with data from Olsera
  initializeStockReport: async (reportId: string, stockDate: string) => {
    const response = await axiosInstance.post(`/reports/${reportId}/initialize`, {
      stockDate
    });
    return response.data;
  },

  // Get stock report with all items
  getStockReport: async (reportId: string) => {
    const response = await axiosInstance.get(`/reports/${reportId}`);
    return response.data;
  },

  // Update stock item with actual closing stock
  updateStockItem: async (itemId: string, data: {
    actualClosing: number;
    notes?: string;
    photoId?: string;
  }) => {
    const response = await axiosInstance.patch(`/items/${itemId}`, data);
    return response.data;
  },

  // Upload photo for stock item
  uploadStockPhoto: async (itemId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await axiosInstance.post(`/items/${itemId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get stock report summary
  getStockSummary: async (reportId: string) => {
    const response = await axiosInstance.get(`/reports/${reportId}/summary`);
    return response.data;
  },

  // Finalize stock report
  finalizeStockReport: async (reportId: string) => {
    const response = await axiosInstance.post(`/reports/${reportId}/finalize`);
    return response.data;
  },

  // Get photo URL
  getPhotoUrl: (photoId: string) => {
    const token = getAuthToken();
    return `${API_BASE_URL}/stock/photos/${photoId}?token=${token}`;
  }
};

export interface StockReportItem {
  id: string;
  stockReportId: string;
  productId: string;
  productName: string;
  productSku?: string;
  unit: string;
  openingStock: number;
  expectedOut: number;
  actualClosing?: number;
  difference?: number;
  photoId?: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockReport {
  id: string;
  reportId: string;
  stockDate: string;
  syncedAt?: string;
  completedAt?: string;
  items: StockReportItem[];
}

export interface StockReportStats {
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
  totalDifference: number;
  negativeDifferences: StockReportItem[];
  positiveDifferences: StockReportItem[];
}