/**
 * Cross-platform storage utility
 * Works in React Native, React Native Web, and regular web browsers
 */

// Simple in-memory fallback for when neither AsyncStorage nor localStorage is available
const memoryStorage = {};

const storage = {
  /**
   * Get an item from storage
   * @param {string} key - The key to retrieve
   * @returns {Promise<string|null>} - The stored value or null
   */
  async getItem(key) {
    try {
      // Try React Native AsyncStorage first
      if (typeof window !== 'undefined' && window.__reactNativeWebView) {
        // React Native WebView - use localStorage
        return localStorage.getItem(key);
      } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        // React Native mobile
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Web browser
        return localStorage.getItem(key);
      } else {
        // Fallback to memory storage
        return memoryStorage[key] || null;
      }
    } catch (error) {
      console.warn('Storage getItem error:', error);
      // Fallback to memory storage
      return memoryStorage[key] || null;
    }
  },

  /**
   * Set an item in storage
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      // Try React Native AsyncStorage first
      if (typeof window !== 'undefined' && window.__reactNativeWebView) {
        // React Native WebView - use localStorage
        localStorage.setItem(key, value);
      } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        // React Native mobile
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Web browser
        localStorage.setItem(key, value);
      } else {
        // Fallback to memory storage
        memoryStorage[key] = value;
      }
    } catch (error) {
      console.warn('Storage setItem error:', error);
      // Fallback to memory storage
      memoryStorage[key] = value;
    }
  },

  /**
   * Remove an item from storage
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      // Try React Native AsyncStorage first
      if (typeof window !== 'undefined' && window.__reactNativeWebView) {
        // React Native WebView - use localStorage
        localStorage.removeItem(key);
      } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        // React Native mobile
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Web browser
        localStorage.removeItem(key);
      } else {
        // Fallback to memory storage
        delete memoryStorage[key];
      }
    } catch (error) {
      console.warn('Storage removeItem error:', error);
      // Fallback to memory storage
      delete memoryStorage[key];
    }
  },

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      // Try React Native AsyncStorage first
      if (typeof window !== 'undefined' && window.__reactNativeWebView) {
        // React Native WebView - use localStorage
        localStorage.clear();
      } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        // React Native mobile
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.clear();
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Web browser
        localStorage.clear();
      } else {
        // Fallback to memory storage
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      }
    } catch (error) {
      console.warn('Storage clear error:', error);
      // Fallback to memory storage
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  }
};

export default storage;