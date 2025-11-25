/**
 * Centralized API Client
 * 
 * Uses environment variable VITE_API_BASE_URL for base URL configuration.
 * Falls back to /api for same-origin requests or localhost for development.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiBaseUrl } from './api-config';

const baseURL = getApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (dev only)
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error logging
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response) {
        console.error(
          `[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} failed:`,
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error('[API] No response received:', error.request);
      } else {
        console.error('[API] Error setting up request:', error.message);
      }
      return Promise.reject(error);
    }
  );
}

export default api;

