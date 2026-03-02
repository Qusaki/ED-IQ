
import apiClient from './apiConfig';

export const fileMetadataService = {
  async getFileMetadata(fileName) {
    try {
      const response = await apiClient.post('/chat/metadata', null, {
        params: { file: fileName }
      });
      return {
        success: true,
        metadata: response.data
      };
    } catch (error) {
      console.error('File Metadata API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get file metadata'
      };
    }
  },

  // Extract the stored filename from a URL
  extractStoredFileName(url) {
    if (!url) return null;
    try {
      const decoded = decodeURIComponent(url.split('?')[0]);
      const marker = '/object/public/';
      const pathPortion = decoded.includes(marker)
        ? decoded.split(marker)[1]
        : decoded;
      const segments = pathPortion.split('/');
      return segments.pop() || segments.pop() || null;
    } catch (error) {
      console.error('Error extracting stored filename from URL:', error);
      return null;
    }
  }
};
