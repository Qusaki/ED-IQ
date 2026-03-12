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
      // Handle null token, 401, 403, and 404 gracefully
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
        console.log('No lectures available or no access/logged out (status:', error.response?.status, ')');
        return [];
      }
      return [];
    }
  },

  // Get a specific activity by ID
  async getActivityById(subjectId, activityId) {
    try {
      console.log(`Fetching activity ${activityId} for subject ${subjectId}`);
      const res = await apiClient.get(`/activities/${subjectId}/${activityId}`);
      return res.data;
    } catch (error) {
      console.error('Error fetching activity:', error);
      throw error;
    }
  },

  // Get all activities for a subject
  async getActivities(subjectId) {
    try {
      const res = await apiClient.get(`/activities/${subjectId}`);
      console.log('Activities response:', res.data);
      return res.data || [];
    } catch (error) {
      // Handle 401, 403 and 404 gracefully
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
        console.log('No activities available or no access/logged out (status:', error.response?.status, ')');
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
          console.log('Processing file for lecture:', data.file);

          // Extract filename from URI or use fallback
          let filename = data.file.filename || data.file.name || data.file.uri.split('/').pop() || 'file';

          // Ensure filename has proper extension
          if (!filename.includes('.') && data.file.uri) {
            if (data.file.uri.endsWith('.pdf')) {
              filename += '.pdf';
            } else if (data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)) {
              filename += data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)[0];
            }
          }

          // Determine file type
          let fileType = data.file.mimeType || data.file.type;
          if (!fileType) {
            if (data.file.uri.endsWith('.pdf')) {
              fileType = 'application/pdf';
            } else if (data.file.uri.match(/\.(jpg|jpeg)$/i)) {
              fileType = 'image/jpeg';
            } else if (data.file.uri.endsWith('.png')) {
              fileType = 'image/png';
            } else if (data.file.uri.endsWith('.gif')) {
              fileType = 'image/gif';
            } else {
              fileType = 'application/octet-stream';
            }
          }

          const fileObject = {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          };

          formData.append('file', fileObject);
          console.log('Added file to lecture FormData:', { filename, fileType, uri: data.file.uri });
        } catch (fileError) {
          console.error('Could not add file to lecture FormData:', fileError);
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

  // Update a lecture
  async updateLecture(lectureId, data) {
    try {
      const formData = new FormData();

      if (data.title) formData.append('title', data.title);
      if (data.content !== undefined) formData.append('content', data.content);

      if (data.file && data.file.uri) {
        try {
          let filename = data.file.filename || data.file.name || data.file.uri.split('/').pop() || 'file';
          if (!filename.includes('.') && data.file.uri) {
            if (data.file.uri.endsWith('.pdf')) filename += '.pdf';
            else if (data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)) filename += data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)[0];
          }

          let fileType = data.file.mimeType || data.file.type;
          if (!fileType) {
            if (data.file.uri.endsWith('.pdf')) fileType = 'application/pdf';
            else if (data.file.uri.match(/\.(jpg|jpeg)$/i)) fileType = 'image/jpeg';
            else if (data.file.uri.endsWith('.png')) fileType = 'image/png';
            else fileType = 'application/octet-stream';
          }

          formData.append('file', {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          });
        } catch (e) {
          console.error('Could not add file to lecture update FormData:', e);
        }
      }

      const res = await apiClient.put(`/lectures/${lectureId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (error) {
      console.error('Error in updateLecture:', error);
      throw new Error(error?.response?.data?.detail || error?.message || 'Failed to update lecture');
    }
  },

  // Delete a lecture
  async deleteLecture(lectureId) {
    try {
      const res = await apiClient.delete(`/lectures/${lectureId}`);
      return res.data;
    } catch (error) {
      console.error('Error in deleteLecture:', error);
      throw new Error(error?.response?.data?.detail || error?.message || 'Failed to delete lecture');
    }
  },

  // Create an activity or quiz
  async createActivity(subjectId, data) {
    try {
      const formData = new FormData();

      // Handle quiz by prefixing title, handle exam by prefixing with EXAM:
      let title = data.title;
      if (data.type === 'quiz') {
        title = `QUIZ: ${data.title}`;
      } else if (data.type === 'exam') {
        title = `EXAM: ${data.title}`;
      }
      formData.append('title', title);

      // Append content only if not empty
      if (data.content && data.content.trim()) {
        formData.append('content', data.content);
      }

      // Add max_score
      formData.append('max_score', String(data.maxScore || 100));

      // Add due_date if present
      if (data.dueDate) {
        // Assuming data.dueDate is an ISO string or can be parsed by backend
        formData.append('due_date', data.dueDate);
      }

      // Add exam-specific fields
      if (data.type === 'exam') {
        formData.append('category', data.category || 'major exam');
        formData.append('term', data.term || 'midterm');
      } else if (data.type === 'lab') {
        formData.append('category', data.category || 'laboratory');
        formData.append('term', data.term || 'midterm');
      } else if (data.type === 'assignment') {
        formData.append('category', data.category || 'assignment');
        formData.append('term', data.term || 'midterm');
      } else if (data.type === 'project') {
        formData.append('category', data.category || 'project');
        formData.append('term', data.term || 'midterm');
      } else if (data.type === 'activity' || data.type === 'quiz') {
        // Add term field for activities and quizzes
        formData.append('term', data.term || 'midterm');
        // Default category for non-exam activities
        formData.append('category', data.category || 'quiz');
      } else {
        // Default values for non-exam activities
        formData.append('category', data.category || 'quiz');
        formData.append('term', data.term || 'midterm');
      }

      // Add file if present (optional - creation can work without file)
      if (data.file && data.file.uri) {
        try {
          console.log('Processing file for activity:', data.file);

          // Extract filename from URI or use fallback
          let filename = data.file.filename || data.file.name || data.file.uri.split('/').pop() || 'file';

          // Ensure filename has proper extension
          if (!filename.includes('.') && data.file.uri) {
            if (data.file.uri.endsWith('.pdf')) {
              filename += '.pdf';
            } else if (data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)) {
              filename += data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)[0];
            }
          }

          // Determine file type
          let fileType = data.file.mimeType || data.file.type;
          if (!fileType) {
            if (data.file.uri.endsWith('.pdf')) {
              fileType = 'application/pdf';
            } else if (data.file.uri.match(/\.(jpg|jpeg)$/i)) {
              fileType = 'image/jpeg';
            } else if (data.file.uri.endsWith('.png')) {
              fileType = 'image/png';
            } else if (data.file.uri.endsWith('.gif')) {
              fileType = 'image/gif';
            } else {
              fileType = 'application/octet-stream';
            }
          }

          const fileObject = {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          };

          formData.append('file', fileObject);
          console.log('Added file to activity FormData:', { filename, fileType, uri: data.file.uri });
        } catch (fileError) {
          console.error('Could not add file to activity FormData:', fileError);
          // Continue without file if there's an issue
        }
      }

      console.log('Creating activity with FormData:', { title: title, content: data.content, max_score: data.maxScore, category: data.category, term: data.term, hasFile: !!data.file });

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

  // Update an activity
  async updateActivity(activityId, data) {
    try {
      const formData = new FormData();

      if (data.title) {
        formData.append('title', data.title);
      }
      if (data.content !== undefined) {
        formData.append('content', data.content);
      }
      if (data.maxScore) {
        formData.append('max_score', String(data.maxScore));
      }
      if (data.category) {
        formData.append('category', data.category);
      }
      if (data.term) {
        formData.append('term', data.term);
      }
      if (data.dueDate) {
        formData.append('due_date', data.dueDate);
      }
      if (data.file) {
        try {
          // Extract filename from URI or use fallback
          let filename = data.file.filename || data.file.name || data.file.uri.split('/').pop() || 'file';

          // Ensure filename has proper extension
          if (!filename.includes('.') && data.file.uri) {
            if (data.file.uri.endsWith('.pdf')) {
              filename += '.pdf';
            } else if (data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)) {
              filename += data.file.uri.match(/\.(jpg|jpeg|png|gif)$/i)[0];
            }
          }

          // Determine file type
          let fileType = data.file.mimeType || data.file.type || 'application/octet-stream';

          const fileObject = {
            uri: data.file.uri,
            type: fileType,
            name: filename,
          };

          formData.append('file', fileObject);
        } catch (fileError) {
          console.error('Could not add file to activity FormData:', fileError);
        }
      }

      console.log('Updating activity with formData:', { title: data.title, content: data.content, hasFile: !!data.file });

      const res = await apiClient.put(`/activities/${activityId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } catch (error) {
      console.error('Error in updateActivity:', error);
      throw new Error(error?.response?.data?.detail || error?.message || 'Failed to update activity');
    }
  },

  // Delete an activity
  async deleteActivity(activityId) {
    try {
      const res = await apiClient.delete(`/activities/${activityId}`);
      return res.data;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  },
  // Unified create method
  async createContent(subjectId, data) {
    const type = data.type; // 'lecture', 'activity', 'quiz', or 'exam'

    if (type === 'lecture') {
      return await this.createLecture(subjectId, data);
    } else {
      // activity, quiz, or exam
      return await this.createActivity(subjectId, data);
    }
  },

  // SUBMISSION MANAGEMENT

  // Submit work for an activity
  async submitActivity(activityId, data) {
    try {
      const formData = new FormData();

      if (data.content) {
        formData.append('content', data.content);
      }

      if (data.file) {
        formData.append('file', {
          uri: data.file.uri,
          type: data.file.type || 'application/octet-stream',
          name: data.file.name
        });
      }

      const res = await apiClient.post(`/submissions/${activityId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data;
    } catch (error) {
      console.error('Error submitting activity:', error);
      throw error;
    }
  },

  // Get own submission for an activity
  async getOwnSubmission(activityId) {
    try {
      const res = await apiClient.get(`/submissions/self/${activityId}`);
      return res.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No submission found
      }
      console.error('Error getting own submission:', error);
      throw error;
    }
  },

  // Get a single submission by id (teacher view)
  async getSubmissionById(submissionId) {
    try {
      const res = await apiClient.get(`/submissions/view/${submissionId}`);
      return res.data;
    } catch (error) {
      console.error('Error getting submission by id:', error);
      throw error;
    }
  },

  // Get all submissions for an activity (teacher only)
  async getSubmissions(activityId) {
    try {
      const res = await apiClient.get(`/submissions/${activityId}`);
      return res.data;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        return []; // Return empty array instead of throwing error if no submissions or logged out
      }
      console.error('Error getting submissions:', error);
      throw error;
    }
  },

  // OFFLINE SCORING

  // Get all approved students in a subject for offline grading
  async getOfflineStudents(subjectId) {
    try {
      const res = await apiClient.get(`/offline/students/${subjectId}`);
      return res.data;
    } catch (error) {
      console.error('Error fetching offline students:', error);
      throw new Error(error?.response?.data?.detail || 'Failed to fetch offline students');
    }
  },

  // Submit bulk grades for offline activity
  async submitOfflineScores(activityId, scoresArray) {
    try {
      // scoresArray should be in format: [{ student_id: "...", score: 100 }, ...]
      const res = await apiClient.post(`/offline/score/${activityId}`, scoresArray);
      return res.data;
    } catch (error) {
      console.error('Error submitting offline scores:', error);
      throw new Error(error?.response?.data?.detail || 'Failed to submit offline scores');
    }
  },

  // Grade a submission
  async gradeSubmission(submissionId, score) {
    try {
      // Use the correct backend endpoint: PUT /submissions/score/{submissionId} with FormData
      const formData = new FormData();
      formData.append('score', score);

      const res = await apiClient.put(`/submissions/score/${submissionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data;
    } catch (error) {
      console.error('Error grading submission:', error);
      throw error;
    }
  },

  // Update submission
  async updateSubmission(submissionId, data) {
    try {
      const formData = new FormData();

      if (data.content) {
        formData.append('content', data.content);
      }

      if (data.file) {
        formData.append('file', {
          uri: data.file.uri,
          type: data.file.type || 'application/octet-stream',
          name: data.file.name
        });
      }

      const res = await apiClient.put(`/submissions/${submissionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  },

  // Delete submission
  async deleteSubmission(submissionId) {
    try {
      await apiClient.delete(`/submissions/${submissionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  },

  // Check if activity is submitted
  async isActivitySubmitted(activityId) {
    try {
      const submission = await this.getOwnSubmission(activityId);
      return !!submission;
    } catch (error) {
      return false;
    }
  },

  // Get submission status with grade
  async getSubmissionStatus(activityId) {
    try {
      const submission = await this.getOwnSubmission(activityId);
      if (!submission) {
        return { submitted: false, graded: false, score: null };
      }

      return {
        submitted: true,
        graded: submission.score > 0,
        score: submission.score,
        submittedAt: submission.created_at,
        gradedAt: submission.updated_at
      };
    } catch (error) {
      return { submitted: false, graded: false, score: null };
    }
  },

  // Get bulk submission status for all activities in a subject
  async getSubmissionStatusesBulk(subjectId) {
    try {
      const res = await apiClient.get(`/submissions/status/${subjectId}`);
      return res.data || {};
    } catch (error) {
      console.error('Error fetching bulk submission statuses:', error);
      return {};
    }
  },

  // UTILITY FUNCTIONS

  // Format submission data for display
  formatSubmission(submission) {
    if (!submission) return null;

    return {
      id: submission.id,
      content: submission.content,
      fileUrl: submission.file_url,
      score: submission.score,
      studentId: submission.student_id,
      activityId: submission.activity_id,
      submittedAt: submission.created_at,
      updatedAt: submission.updated_at,
      isGraded: submission.score > 0
    };
  },

  // Format submissions list for teacher view
  formatSubmissionsList(submissions) {
    return submissions.map(sub => this.formatSubmission(sub));
  },

  // Get student's current grade for a subject
  async getStudentGrade(subjectId) {
    try {
      console.log('Fetching student grade for subject:', subjectId);
      const res = await apiClient.get(`/computegrade/current/${subjectId}`);
      console.log('Student grade response:', res.data);
      return res.data || null;
    } catch (error) {
      // Check if it's a network/connection error
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || !error.response) {
        console.warn('Backend server is not running - using offline mode');
        return null; // Trigger fallback calculation
      }

      // 404 is expected when grade computation fails - suppress error logging
      if (error.response?.status === 404) {
        console.log('Grade not available for subject:', subjectId, '- will use fallback calculation');
        return null;
      }

      // Log other errors
      console.error('Error fetching student grade:', error.message);
      // Return null instead of throwing to allow fallback calculation
      return null;
    }
  },

  // Get a specific student's computed grade (teacher use - calls backend weighted formula)
  async getStudentGradeAsTeacher(studentId, subjectId) {
    try {
      console.log(`Fetching grade for student ${studentId} in subject ${subjectId}`);
      const res = await apiClient.get(`/computegrade/${studentId}/${subjectId}`);
      console.log(`Grade API response for ${studentId}:`, res.data);
      return res.data?.score ?? 0;
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      console.warn(`Grade API failed for student ${studentId}: status=${status}, detail=${detail}, message=${error.message}`);
      // Return 0 when backend computation fails (e.g., no activities yet)
      return 0;
    }
  },

  // Get detailed performance breakdown for a student
  async getStudentPerformance(subjectId) {
    try {
      // Get all activities for the subject
      const activities = await this.getActivities(subjectId);
      const performance = [];

      for (const activity of activities) {
        try {
          const submission = await this.getOwnSubmission(activity.id);
          if (submission && submission.score !== null && submission.score !== undefined) {
            const percentage = activity.max_score > 0 ? (submission.score / activity.max_score) * 100 : 0;
            performance.push({
              id: activity.id,
              title: activity.title,
              category: activity.category,
              term: activity.term,
              score: submission.score,
              maxScore: activity.max_score,
              percentage: percentage,
              submittedAt: submission.created_at,
              gradedAt: submission.updated_at
            });
          }
        } catch (error) {
          console.warn(`Error getting submission for activity ${activity.id}:`, error);
        }
      }

      // Sort by submitted date (newest first)
      performance.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      return performance;
    } catch (error) {
      console.error('Error fetching student performance:', error);
      return [];
    }
  },

};