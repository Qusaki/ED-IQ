import apiClient from './apiConfig';

export const subjectService = {
  async listMySubjects() {
    const res = await apiClient.get('/subjects');
    return res.data;
  },

  async createSubject(name) {
    const res = await apiClient.post('/subjects', { name });
    return res.data; // { id, name, code }
  },

  async joinByCode(code) {
    const res = await apiClient.post('/subjects/join', { code });
    return res.data; // subject
  },

  async updateSubject(subjectId, name) {
    const formData = new FormData();
    formData.append('name', name);
    const res = await apiClient.put(`/subjects/${subjectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  async deleteSubject(subjectId) {
    const res = await apiClient.delete(`/subjects/${subjectId}`);
    return res.data;
  },

  // Enrollment management functions
  async getSubjectStudents(subjectId) {
    const res = await apiClient.get(`/subjects/${subjectId}/students`);
    return res.data; // Array of StudentInSubject
  },

  async acceptStudent(subjectId, studentId) {
    const res = await apiClient.post(`/subjects/${subjectId}/students/${studentId}/accept`);
    return res.data; // EnrollmentActionResponse
  },

  async rejectStudent(subjectId, studentId) {
    const res = await apiClient.post(`/subjects/${subjectId}/students/${studentId}/reject`);
    return res.data; // EnrollmentActionResponse
  },

  async getStudentSubjectStatus(subjectId) {
    const res = await apiClient.get(`/subjects/${subjectId}/status`);
    return res.data; // SubjectEnrollmentResponse
  }
};

export default subjectService;