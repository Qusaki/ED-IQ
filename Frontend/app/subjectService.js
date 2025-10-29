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
