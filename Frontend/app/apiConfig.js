// Ito ay sa apiConfig.js
import axios from 'axios';
import { Alert, DeviceEventEmitter } from 'react-native';
import { TokenManager } from '../components/_TokenManager';

// Backend base URL
export const RENDER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ed-iq.onrender.com';
export const LOCAL_API_URL = 'http://localhost:8000'; // Local FastAPI default
export const USE_LOCAL_BACKEND = false; // Set to true to test locally, false to use Render

export const API_URL = USE_LOCAL_BACKEND ? LOCAL_API_URL : RENDER_URL;
export const USE_MOCK_DATA = false; // Enable real API calls

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Setup axios interceptors
export const setupAxiosInterceptors = () => {
  // Request interceptor to add token
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await TokenManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Added token to request');
        }
        return config;
      } catch (error) {
        console.error('Request interceptor error:', error);
        return config;
      }
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token expiration
  apiClient.interceptors.response.use(
    (response) => {
      console.log('API Response successful:', response.config?.url);
      return response;
    },
    async (error) => {
      // Better error logging - skip logging for expected 404 errors
      if (error.response) {
        // Only log non-404 and non-401 errors
        if (error.response.status !== 404 && error.response.status !== 401) {
          console.log('API Response error:', error.response.status, error.response.data);
        }
      } else if (error.request) {
        console.log('API Request error - No response received');
      } else {
        console.log('API Error:', error.message);
      }

      // Handle network errors
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error' || !error.response) {
        console.log('Network connectivity issue detected');
        // Don't show alert for every network error
        return Promise.reject(error);
      }

      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.log('Request timeout - treated silently');
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
        // Token expired or invalid
        console.log('401 Unauthorized encountered');

        // Only show alert if we actually had a valid token that expired, 
        // preventing alerts during or immediately after user-initiated logout
        const currentToken = await TokenManager.getToken();
        if (currentToken) {
          console.log('Token expired, clearing session');
          await TokenManager.clearAll();
          // We can keep Session Expired alert or make it silent too. 
          // User asked for ALL errors to be silent.
          console.log('Session Expired - Please login again.');
        }
      } else if (error.response?.status === 403) {
        // Handle backend bug: wrong or/and logic in lecture_post.py line 56
        console.log('Access forbidden - backend logic issue, treating as empty content');
        // Don't throw error, let caller handle gracefully
      } else if (error.response?.status === 404) {
        console.log('No content found:', error.config?.url);
        // Don't show alert for 404 errors - they might be expected
      } else if (error.response?.status >= 500) {
        console.log('Server error (5xx) detected:', error.response?.status);
        // Silenced Server Error alert per user request
      }

      return Promise.reject(error);
    }
  );
};

// Export the apiClient as default
export default apiClient;