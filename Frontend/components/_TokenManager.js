// TokenManager.js ito
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TokenManager = {
  async saveToken(token) {
    try {
      // Add validation to prevent saving null/undefined values
      if (token === null || token === undefined) {
        console.warn('Attempted to save null/undefined token');
        return;
      }
      await AsyncStorage.setItem('auth_token', token);
      console.log('Token saved successfully');
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  async getToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken() {
    try {
      await AsyncStorage.removeItem('auth_token');
      console.log('Token removed successfully');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  async saveUser(user) {
    try {
      // Add validation to prevent saving null/undefined values
      if (user === null || user === undefined) {
        console.warn('Attempted to save null/undefined user');
        return;
      }
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      console.log('User data saved successfully');
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser() {
    try {
      await AsyncStorage.removeItem('user_data');
      console.log('User data removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  async clearAll() {
    try {
      await this.removeToken();
      await this.removeUser();
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
};

export default TokenManager;
