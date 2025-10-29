import apiClient from './apiConfig';

export const contentService = {
  // Get all lectures for a subject
  async getLectures(subjectId) {
    try {
      console.log('Fetching lectures for subject:', subjectId);
      const res = await apiClient.get(`/lectures/${subjectId}`);
      console.log('Lectures response:', res.data);
      return res.data || [];
    } catch (error) {
      console.log('Lectures fetch error - status:', error.response?.status, 'detail:', error.response?.data?.detail);
      // Handle 403 and 404 gracefully
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('No lectures available or no access (status:', error.response?.status, ')');
        return [];
      }
      console.error('Error fetching lectures:', error);
      return [];
    }
  },

  // Get all activities for a subject
  async getActivities(subjectId) {
    try {
      const res = await apiClient.get(`/activities/${subjectId}`);
      console.log('Activities response:', res.data);
      return res.data || [];
    } catch (error) {
      // Handle 403 and 404 gracefully
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('No activities available or no access (status:', error.response?.status, ')');
        return [];
      }
      console.error('Error fetching activities:', error);
      return [];
    }
  },

  // Get all content (lectures + activities) for a subject
  async getSubjectContent(subjectId) {
    try {
      const [lectures, activities] = await Promise.all([
        this.getLectures(subjectId),
        this.getActivities(subjectId)
      ]);
      
      console.log('Fetched content:', { lectures: lectures.length, activities: activities.length });
      
      // Combine and add type field
      const content = [
        ...lectures.map(item => ({ ...item, type: 'lecture' })),
        ...activities.map(item => ({ ...item, type: 'activity' }))
      ];
      
      console.log('Total combined content:', content.length);
      
      // Sort by created_at descending
      const sorted = content.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('Sorted content:', sorted);
      return sorted;
    } catch (error) {
      console.error('Error fetching content:', error);
      return [];
    }
  },

  // Create a lecture
  async createLecture(subjectId, data) {
    try {
      const formData = new FormData();
      
      formData.append('title', data.title);
      
      // Append content only if not empty
      if (data.content && data.content.trim()) {
        formData.append('content', data.content);
      }

      // Add file if present (optional - creation can work without file)
      if (data.file && data.file.uri) {
        try {
          const filename = data.file.filename || data.file.uri.split('/').pop() || 'file';
          const fileType = data.file.type || (data.file.uri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          
          formData.append('file', {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          });
          console.log('Added file to FormData:', { filename, fileType });
        } catch (fileError) {
          console.warn('Could not add file to FormData:', fileError);
          // Continue without file if there's an issue
        }
      }

      console.log('Creating lecture with FormData:', { title: data.title, content: data.content, hasFile: !!data.file });
      
      try {
        const res = await apiClient.post(`/lectures/${subjectId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data;
      } catch (error) {
        console.error('Error in API call:', error);
        // Re-throw with better message
        throw new Error(error?.response?.data?.detail || error?.message || 'Failed to create lecture');
      }
    } catch (error) {
      console.error('Error in createLecture:', error);
      throw error;
    }
  },

  // Create an activity or quiz
  async createActivity(subjectId, data) {
    try {
      const formData = new FormData();
      
      // Handle quiz by prefixing title
      const title = data.type === 'quiz' ? `QUIZ: ${data.title}` : data.title;
      formData.append('title', title);
      
      // Append content only if not empty
      if (data.content && data.content.trim()) {
        formData.append('content', data.content);
      }

      // Add max_score
      formData.append('max_score', String(data.maxScore || 100));

      // Add file if present (optional - creation can work without file)
      if (data.file && data.file.uri) {
        try {
          const filename = data.file.filename || data.file.uri.split('/').pop() || 'file';
          const fileType = data.file.type || (data.file.uri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          
          formData.append('file', {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          });
          console.log('Added file to FormData:', { filename, fileType });
        } catch (fileError) {
          console.warn('Could not add file to FormData:', fileError);
          // Continue without file if there's an issue
        }
      }

      console.log('Creating activity with FormData:', { title: title, content: data.content, max_score: data.maxScore, hasFile: !!data.file });

      try {
        const res = await apiClient.post(`/activities/${subjectId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data;
      } catch (error) {
        console.error('Error in API call:', error);
        // Re-throw with better message
        throw new Error(error?.response?.data?.detail || error?.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error in createActivity:', error);
      throw error;
    }
  },

  // Unified create method
  async createContent(subjectId, data) {
    const type = data.type; // 'lecture', 'activity', or 'quiz'
    
    if (type === 'lecture') {
      return await this.createLecture(subjectId, data);
    } else {
      // activity or quiz
      return await this.createActivity(subjectId, data);
    }
  },
};
