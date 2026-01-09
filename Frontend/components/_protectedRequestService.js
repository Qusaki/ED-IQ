// protectedRequestService.js ito
import apiClient from '../app/apiConfig';
import { RBACManager, ROLES } from '../app/rbacManager'; // Fixed import

export const protectedRequestService = {
  // Admin-only requests
  async makeAdminRequest(endpoint, method = 'GET', data = null) {
    try {
      // Check if user has admin role before making request
      const hasAdminRole = await RBACManager.hasRole(ROLES.ADMIN);
      if (!hasAdminRole) {
        throw new Error('Admin access required');
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Admin request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // Teacher-only requests
  async makeTeacherRequest(endpoint, method = 'GET', data = null) {
    try {
      // Check if user has teacher role before making request
      const hasTeacherRole = await RBACManager.hasRole(ROLES.TEACHER);
      if (!hasTeacherRole) {
        throw new Error('Teacher access required');
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Teacher request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // Student-only requests
  async makeStudentRequest(endpoint, method = 'GET', data = null) {
    try {
      // Check if user has student role before making request
      const hasStudentRole = await RBACManager.hasRole(ROLES.STUDENT);
      if (!hasStudentRole) {
        throw new Error('Student access required');
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Student request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // Role-based request (can specify multiple allowed roles)
  async makeRoleBasedRequest(endpoint, allowedRoles = [], method = 'GET', data = null) {
    try {
      // Check if user has any of the allowed roles
      const hasRole = await RBACManager.hasAnyRole(allowedRoles);
      if (!hasRole) {
        throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Role-based request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // Permission-based request
  async makePermissionBasedRequest(endpoint, requiredPermissions = [], method = 'GET', data = null) {
    try {
      // Check if user has required permissions
      const hasPermission = await RBACManager.hasAnyPermission(requiredPermissions);
      if (!hasPermission) {
        throw new Error(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Permission-based request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // Specific API calls based on your backend routes
  async getAdminOnlyData() {
    try {
      const res = await apiClient.get('/protected/admin_only');
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  async getTeacherOnlyData() {
    try {
      const res = await apiClient.get('/protected/teacher_only');
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  async getStudentOnlyData() {
    try {
      const res = await apiClient.get('/protected/student_only');
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Course management (admin and teacher)
  async getCourses() {
    // Return mock data instead of making API call
    return { success: true, data: [{ id: 1, name: 'Sample Course', description: 'This is a sample course' }] };
  },

  async createCourse(courseData) {
    return await this.makeRoleBasedRequest('/courses', [ROLES.ADMIN, ROLES.TEACHER], 'POST', courseData);
  },

  async updateCourse(courseId, courseData) {
    return await this.makeRoleBasedRequest(`/courses/${courseId}`, [ROLES.ADMIN, ROLES.TEACHER], 'PUT', courseData);
  },

  async deleteCourse(courseId) {
    return await this.makeRoleBasedRequest(`/courses/${courseId}`, [ROLES.ADMIN, ROLES.TEACHER], 'DELETE');
  },

  // Student-specific requests
  async getMyEnrolledCourses() {
    return await this.makeStudentRequest('/student/courses', 'GET');
  },

  async enrollInCourse(courseId) {
    return await this.makeStudentRequest('/student/enroll', 'POST', { courseId });
  },

  async getMyGrades() {
    // Return mock data instead of making API call
    return { success: true, data: [{ subject: 'Math', grade: 'A', score: 95 }] };
  },

  async submitAssignment(assignmentId, submissionData) {
    return await this.makeStudentRequest('/student/assignments/submit', 'POST', { 
      assignmentId, 
      ...submissionData 
    });
  },

  // Generic protected request with automatic role/permission checking
  async makeProtectedRequest(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      requiredRoles = [],
      requiredPermissions = [],
    } = options;

    try {
      // Check access requirements
      const canAccess = await RBACManager.canAccess(requiredRoles, requiredPermissions);
      if (!canAccess) {
        throw new Error('Access denied. Insufficient permissions.');
      }

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await apiClient(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Protected request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Request failed' 
      };
    }
  },

  // User management (admin only)
  async getAllUsers() {
    try {
      const res = await apiClient.get('/user_management/user');
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  async getUserById(userId) {
    return await this.makeAdminRequest(`/user_management/user/${userId}`, 'GET');
  },

  async createUser(userData) {
    return await this.makeAdminRequest('/user_management/user', 'POST', userData);
  },

  async updateUser(userId, userData) {
    return await this.makeAdminRequest(`/user_management/user/${userId}`, 'PUT', userData);
  },

  async deleteUser(userId) {
    return await this.makeAdminRequest(`/user_management/user/${userId}`, 'DELETE');
  }
};

export default protectedRequestService;
