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
      let errorMessage = 'Failed to get chatbot response';
      if (error.response && error.response.status === 429) {
          errorMessage = error.response.data?.detail || 'You have reached your daily limit of 3 requests. Please try again tomorrow.';
      } else if (error.message) {
          errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }
};