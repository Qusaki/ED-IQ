import apiClient from './apiConfig';

export const chatbotService = {
  async sendMessage(message) {
    try {
      const response = await apiClient.post('/chat/handbook', { message });
      return {
        success: true,
        response: response.data.response
      };

    } catch (error) {
      console.error('Chatbot API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get chatbot response'
      };
    }
  }
};