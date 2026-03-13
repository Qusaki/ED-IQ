import apiClient from './apiConfig';

export const chatbotService = {
  async sendMessage(message) {
    try {
      const response = await apiClient.post('/chat/handbook', { message });
      return {
        success: true,
        response: response.data.response,
        count: response.data.count
      };
    } catch (error) {
      console.error('Chatbot API Error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        status: error.response?.status
      };
    }
  },

  async getUsage() {
    try {
      const response = await apiClient.get('/chat/usage');
      return {
        success: true,
        count: response.data.count,
        limit: response.data.limit
      };
    } catch (error) {
      console.error('Chatbot Usage Error:', error);
      return { success: false, error: error.message };
    }
  }
};