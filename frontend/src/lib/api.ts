/**
 * API Client Configuration
 * ========================
 * Axios instance configured for the backend API.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// API base URL - change this to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage key
const TOKEN_KEY = 'bookify_token';

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set auth token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if token exists
 */
export function hasToken(): boolean {
  return !!getToken();
}

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      removeToken();
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Extract error message
    const message = 
      error.response?.data?.message || 
      error.message || 
      'An unexpected error occurred';

    // Create a more useful error
    const enhancedError = new Error(message) as Error & { 
      status?: number; 
      errors?: Record<string, string[]>;
    };
    enhancedError.status = error.response?.status;
    enhancedError.errors = error.response?.data?.errors;

    return Promise.reject(enhancedError);
  }
);

export default api;

// ============================================
// API ENDPOINTS
// ============================================

// Auth API
export const authApi = {
  signup: (data: { name: string; email: string; password: string; phone?: string; role: 'USER' | 'ORGANIZER' }) =>
    api.post('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  verifyOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  resendOtp: (data: { email: string }) =>
    api.post('/auth/resend-otp', data),

  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),

  verifyPasswordResetOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-password-reset-otp', data),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),

  me: () =>
    api.get('/auth/me'),
};

// User API
export const userApi = {
  getProfile: () =>
    api.get('/user/me'),

  updateProfile: (data: { name: string }) =>
    api.patch('/user/me', data),

  getBookings: () =>
    api.get('/user/bookings'),
};

// Services API (Public)
export const servicesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/services', { params }),

  getById: (id: string, date?: string) =>
    api.get(`/services/${id}`, { params: date ? { date } : undefined }),

  getCategories: () =>
    api.get('/services/categories'),
};

// Organizer API
export const organizerApi = {
  getStats: () =>
    api.get('/organizer/stats'),

  getServices: () =>
    api.get('/organizer/services'),

  getService: (id: string) =>
    api.get(`/organizer/services/${id}`),

  createService: (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    published?: boolean;
    schedule: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      breakHours?: Array<{ start: string; end: string }>;
    };
  }) =>
    api.post('/organizer/services', data),

  updateService: (id: string, data: Partial<{
    title: string;
    description: string;
    category: string;
    price: number;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }>) =>
    api.patch(`/organizer/services/${id}`, data),

  publishService: (id: string, published: boolean) =>
    api.patch(`/organizer/services/${id}/publish`, { published }),

  deleteService: (id: string) =>
    api.delete(`/organizer/services/${id}`),

  getCalendar: (year: number, month: number) =>
    api.get('/organizer/calendar', { params: { year, month } }),
};

// Bookings API
export const bookingsApi = {
  hold: (slotId: string) =>
    api.post('/bookings/hold', { slotId }),

  confirm: (data: { slotId: string; paymentMode: 'ONLINE' | 'CASH' }) =>
    api.post('/bookings/confirm', data),

  cancelHold: (slotId: string) =>
    api.post('/bookings/cancel-hold', { slotId }),

  getAll: () =>
    api.get('/bookings'),

  getById: (id: string) =>
    api.get(`/bookings/${id}`),

  downloadReceipt: (id: string) =>
    api.post(`/bookings/${id}/receipt`, {}, { responseType: 'blob' }),

  // PhonePe payment initiation
  initiatePayment: (slotId: string) =>
    api.post('/bookings/initiate-payment', { slotId }),
};

// Alias for bookingApi (used in some places)
export const bookingApi = bookingsApi;

// Payment API
export const paymentApi = {
  getStatus: (merchantOrderId: string) =>
    api.get(`/payment/status/${merchantOrderId}`),
};

// Admin API
export const adminApi = {
  getMetrics: () =>
    api.get('/admin/metrics'),

  getServices: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/services', { params }),

  getUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get('/admin/users', { params }),

  getBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/bookings', { params }),

  getActivity: () =>
    api.get('/admin/activity'),
};

// Upload API
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Chat API
export const chatApi = {
  sendMessage: (message: string, sessionId?: string) =>
    api.post('/chat/message', { message, sessionId }),

  clearChat: (sessionId: string) =>
    api.post('/chat/clear', { sessionId }),
};
