// authService.js - Updated with RBAC Integration
import apiClient, { USE_MOCK_DATA } from '../app/apiConfig';
import { TokenManager } from './_TokenManager';
import { RBACManager, ROLES } from '../app/rbacManager';

export const authService = {
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);

      // Check if API is disabled (for testing)
      if (USE_MOCK_DATA) {
        console.log('API disabled, using mock login');
        // Mock login for testing
        const mockUser = {
          id: 'mock-user-123',
          name: email.split('@')[0], // Use email prefix as name
          email: email,
          role: 'student' // Default role for testing
        };
        const mockToken = 'mock-token-' + Date.now();

        // Save mock data
        await TokenManager.saveToken(mockToken);
        await TokenManager.saveUser(mockUser);
        console.log('Mock login successful');
        return { success: true, user: mockUser, token: mockToken };
      }

      const response = await apiClient.post('/auth/login/', {
        email,
        password
      });

      console.log('Login response:', response.data);

      // Check different possible token field names from backend
      const token = response.data.token ||
        response.data.access_token ||
        response.data.accessToken ||
        response.data.access;

      const user = response.data.user || response.data.userData || response.data;

      if (!token) {
        console.error('No token found in response:', response.data);
        return {
          success: false,
          error: 'No authentication token received from server'
        };
      }

      // Validate user role
      if (user && user.role && !RBACManager.isValidRole(user.role)) {
        console.error('Invalid user role:', user.role);
        return {
          success: false,
          error: 'Invalid user role received from server'
        };
      }

      // Save token and user data with validation
      console.log('Saving token and user data...');
      await TokenManager.saveToken(token);
      if (user) {
        await TokenManager.saveUser(user);
        console.log('User logged in with role:', user.role);
        console.log('User data saved to storage');
      }

      console.log('Login successful');
      return { success: true, user, token };
    } catch (error) {
      console.log('Login error (silent):', error?.response?.status, error?.response?.data?.detail);

      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Login failed';
      return { success: false, error: errorMessage };
    }
  },

  async signup(name, email, password, role, studentId) {
    try {
      console.log('Attempting signup for:', email, 'with role:', role);

      // Validate role before sending to backend
      if (!RBACManager.isValidRole(role)) {
        return {
          success: false,
          error: 'Invalid role selected. Please choose a valid role.'
        };
      }

      // Check if API is disabled (for testing)
      if (USE_MOCK_DATA) {
        console.log('API disabled, using mock signup');
        // Mock signup for testing
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          name: name,
          email: email,
          role: role,
          student_id: role === 'student' ? studentId : null
        };
        console.log('Mock signup successful');
        return { success: true, data: mockUser };
      }

      const response = await apiClient.post('/auth/signup/', {
        name,
        email,
        password,
        role,
        student_id: role === 'student' ? studentId : null
      });

      console.log('Signup response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Signup error:', error);

      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Signup failed';
      return { success: false, error: errorMessage };
    }
  },

  async verifyToken() {
    try {
      // Best-effort verification: try self endpoint which requires a valid token
      // Note: Backend's JWT payload uses `id`, while dependency expects `user_id`.
      // If backend isn't updated, this may fail; we'll handle gracefully.
      const response = await apiClient.get('/user_management/user/self');

      // Also verify user role is still valid
      const user = await TokenManager.getUser();
      if (user && user.role && !RBACManager.isValidRole(user.role)) {
        console.error('Invalid user role in stored data:', user.role);
        await TokenManager.clearAll();
        return { success: false, error: 'Invalid user role' };
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Token verification failed (non-fatal):', error?.response?.data || error?.message);
      return { success: false, error: 'Token verification failed' };
    }
  },

  async logout() {
    try {
      console.log('Logging out...');

      // Optional: Call logout endpoint if your backend has one
      // await apiClient.post('/auth/logout/');

      // Clear local storage
      await TokenManager.clearAll();
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local storage
      await TokenManager.clearAll();
      return { success: true };
    }
  },

  async getCurrentUser() {
    try {
      console.log('Getting current user from storage...');
      const user = await TokenManager.getUser();
      const token = await TokenManager.getToken();

      console.log('Retrieved from storage - User:', user ? 'exists' : 'null', 'Token:', token ? 'exists' : 'null');

      if (user && token) {
        // Validate user role
        if (user.role && !RBACManager.isValidRole(user.role)) {
          console.log('Invalid user role found, clearing session');
          await TokenManager.clearAll();
          return { success: false, error: 'Invalid user role' };
        }

        console.log('Found existing user session with role:', user.role);
        // For now, skip token verification to avoid network issues
        // const verification = await this.verifyToken();
        // if (verification.success) {
        //   return { success: true, user, token };
        // } else {
        //   console.log('Token verification failed, clearing session');
        //   await TokenManager.clearAll();
        // }

        // Return the user data directly without verification for now
        return { success: true, user, token };
      }

      return { success: false, error: 'No valid session found' };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { success: false, error: 'Failed to get current user' };
    }
  },

  async refreshUserRole() {
    try {
      console.log('Refreshing user role from server...');
      // Use self endpoint to fetch current user details
      const response = await apiClient.get('/user_management/user/self');
      const updatedUser = response.data.user || response.data;

      if (updatedUser && updatedUser.role) {
        if (!RBACManager.isValidRole(updatedUser.role)) {
          return { success: false, error: 'Invalid role received from server' };
        }

        await TokenManager.saveUser(updatedUser);
        console.log('User role refreshed:', updatedUser.role);
        return { success: true, user: updatedUser };
      }

      return { success: false, error: 'No user data received' };
    } catch (error) {
      console.error('Error refreshing user role:', error);
      return { success: false, error: 'Failed to refresh user role' };
    }
  },

  async updateProfile({ name, password, profilePicture } = {}) {
    try {
      console.log('Updating profile...');

      const formData = new FormData();

      if (name) {
        formData.append('name', name);
      }
      if (password) {
        formData.append('password', password);
      }
      if (profilePicture) {
        // profilePicture should be { uri, name, type } from expo-image-picker
        formData.append('profile_picture', {
          uri: profilePicture.uri,
          name: profilePicture.name || 'profile.jpg',
          type: profilePicture.type || 'image/jpeg',
        });
      }

      const response = await apiClient.put('/user_management/user/self', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Profile update response:', response.data);

      // Update locally stored user data
      const updatedUser = response.data;
      if (updatedUser) {
        await TokenManager.saveUser(updatedUser);
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Profile update failed';
      return { success: false, error: errorMessage };
    }
  },

  async validateUserAccess(requiredRoles = [], requiredPermissions = []) {
    try {
      const user = await TokenManager.getUser();
      if (!user || !user.role) {
        return { success: false, error: 'No user session found' };
      }

      // Check role
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return { success: false, error: 'Insufficient role privileges' };
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasPermissions = await Promise.all(
          requiredPermissions.map(permission =>
            RBACManager.hasPermission(permission)
          )
        );

        if (!hasPermissions.some(Boolean)) {
          return { success: false, error: 'Insufficient permissions' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error validating user access:', error);
      return { success: false, error: 'Failed to validate access' };
    }
  },

  async forgotPassword(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', null, {
        params: { email }
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send reset email';
      return { success: false, error: errorMessage };
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', null, {
        params: { token, new_password: newPassword }
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to reset password';
      return { success: false, error: errorMessage };
    }
  }
};

export default authService;