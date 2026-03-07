// Ito ay sa apiConfig.js
import axios from 'axios';
import { Alert, DeviceEventEmitter } from 'react-native';
import { TokenManager } from '../components/_TokenManager';

// Backend base URL
export const API_URL = 'https://ed-iq.onrender.com';
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
      DeviceEventEmitter.emit('apiLoadingStart');
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
      DeviceEventEmitter.emit('apiLoadingStop');
      console.log('API Response successful:', response.config?.url);
      return response;
    },
    async (error) => {
      DeviceEventEmitter.emit('apiLoadingStop');
      // Better error logging - skip logging for expected 404 errors
      if (error.response) {
        // Only log non-404 and non-401 errors to reduce console noise for handled errors
        if (error.response.status !== 404 && error.response.status !== 401) {
          console.error('API Response error:', error.response.status, error.response.data);
        }
      } else if (error.request) {
        console.error('API Request error - No response received');
      } else {
        console.error('API Error:', error.message);
      }

      // Handle network errors
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error' || !error.response) {
        console.error('Network connectivity issue detected');
        // Don't show alert for every network error
        return Promise.reject(error);
      }

      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('Request timeout');
        Alert.alert(
          'Request Timeout',
          'Server is taking too long to respond. Please try again.'
        );
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
          Alert.alert('Session Expired', 'Please login again.');
        }
      } else if (error.response?.status === 403) {
        // Handle backend bug: wrong or/and logic in lecture_post.py line 56
        console.log('Access forbidden - backend logic issue, treating as empty content');
        // Don't throw error, let caller handle gracefully
      } else if (error.response?.status === 404) {
        console.log('No content found:', error.config?.url);
        // Don't show alert for 404 errors - they might be expected
      } else if (error.response?.status >= 500) {
        console.error('Server error:', error.response?.status);
        Alert.alert(
          'Server Error',
          'Server is experiencing issues. Please try again later.'
        );
      }

      return Promise.reject(error);
    }
  );
};

// Export the apiClient as default
export default apiClient;