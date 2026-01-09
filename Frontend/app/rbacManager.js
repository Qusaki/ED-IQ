import { TokenManager } from '../components/_TokenManager';

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_SYSTEM: 'manage_system',
  VIEW_ALL_DATA: 'view_all_data',
  DELETE_CONTENT: 'delete_content',
  
  // Teacher permissions  
  MANAGE_COURSES: 'manage_courses',
  GRADE_STUDENTS: 'grade_students',
  VIEW_STUDENT_DATA: 'view_student_data',
  CREATE_ASSIGNMENTS: 'create_assignments',
  
  // Student permissions
  VIEW_COURSES: 'view_courses',
  SUBMIT_ASSIGNMENTS: 'submit_assignments',
  VIEW_GRADES: 'view_grades',
  VIEW_PROFILE: 'view_profile'
};

// Define role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SYSTEM, 
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.MANAGE_COURSES,
    PERMISSIONS.GRADE_STUDENTS,
    PERMISSIONS.VIEW_STUDENT_DATA,
    PERMISSIONS.CREATE_ASSIGNMENTS,
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.SUBMIT_ASSIGNMENTS,
    PERMISSIONS.VIEW_GRADES,
    PERMISSIONS.VIEW_PROFILE
  ],
  [ROLES.TEACHER]: [
    PERMISSIONS.MANAGE_COURSES,
    PERMISSIONS.GRADE_STUDENTS,
    PERMISSIONS.VIEW_STUDENT_DATA,
    PERMISSIONS.CREATE_ASSIGNMENTS,
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.VIEW_GRADES,
    PERMISSIONS.VIEW_PROFILE
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.SUBMIT_ASSIGNMENTS,
    PERMISSIONS.VIEW_GRADES,
    PERMISSIONS.VIEW_PROFILE
  ]
};

export const RBACManager = {
  // Validate if role is valid
  isValidRole(role) {
    return Object.values(ROLES).includes(role);
  },

  // Get current user role
  async getCurrentUserRole() {
    try {
      const user = await TokenManager.getUser();
      return user?.role || null;
    } catch (error) {
      console.error('Error getting current user role:', error);
      return null;
    }
  },

  // Check if user has specific role
  async hasRole(requiredRole) {
    try {
      const currentRole = await this.getCurrentUserRole();
      return currentRole === requiredRole;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  },

  // Check if user has any of the required roles
  async hasAnyRole(requiredRoles) {
    try {
      const currentRole = await this.getCurrentUserRole();
      return requiredRoles.includes(currentRole);
    } catch (error) {
      console.error('Error checking user roles:', error);
      return false;
    }
  },

  // Check if user has specific permission
  async hasPermission(permission) {
    try {
      const currentRole = await this.getCurrentUserRole();
      if (!currentRole) return false;
      
      const rolePermissions = ROLE_PERMISSIONS[currentRole] || [];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  },

  // Check if user has any of the required permissions
  async hasAnyPermission(permissions) {
    try {
      const currentRole = await this.getCurrentUserRole();
      if (!currentRole) return false;
      
      const rolePermissions = ROLE_PERMISSIONS[currentRole] || [];
      return permissions.some(permission => rolePermissions.includes(permission));
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  },

  // Check if user has all required permissions
  async hasAllPermissions(permissions) {
    try {
      const currentRole = await this.getCurrentUserRole();
      if (!currentRole) return false;
      
      const rolePermissions = ROLE_PERMISSIONS[currentRole] || [];
      return permissions.every(permission => rolePermissions.includes(permission));
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  },

  // Get all permissions for current user role
  async getUserPermissions() {
    try {
      const currentRole = await this.getCurrentUserRole();
      if (!currentRole) return [];
      
      return ROLE_PERMISSIONS[currentRole] || [];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  },

  // Check if user can access a specific route/feature
  async canAccess(requiredRoles = [], requiredPermissions = []) {
    try {
      // If no requirements specified, allow access
      if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
        return true;
      }

      // Check role requirements
      if (requiredRoles.length > 0) {
        const hasRole = await this.hasAnyRole(requiredRoles);
        if (!hasRole) return false;
      }

      // Check permission requirements  
      if (requiredPermissions.length > 0) {
        const hasPermission = await this.hasAnyPermission(requiredPermissions);
        if (!hasPermission) return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  },

  // Get user's accessible menu items based on role
  async getAccessibleMenuItems() {
    try {
      const role = await this.getCurrentUserRole();
      
      const menuItems = {
        [ROLES.ADMIN]: [
          { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
          { id: 'users', label: 'Manage Users', route: '/users' },
          { id: 'courses', label: 'Manage Courses', route: '/courses' },
          { id: 'reports', label: 'System Reports', route: '/reports' },
          { id: 'settings', label: 'System Settings', route: '/settings' }
        ],
        [ROLES.TEACHER]: [
          { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
          { id: 'my-courses', label: 'My Courses', route: '/my-courses' },
          { id: 'assignments', label: 'Assignments', route: '/assignments' },
          { id: 'grades', label: 'Gradebook', route: '/grades' },
          { id: 'students', label: 'My Students', route: '/students' }
        ],
        [ROLES.STUDENT]: [
          { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
          { id: 'courses', label: 'My Courses', route: '/courses' },
          { id: 'assignments', label: 'Assignments', route: '/assignments' },
          { id: 'grades', label: 'My Grades', route: '/grades' },
          { id: 'profile', label: 'Profile', route: '/profile' }
        ]
      };

      return menuItems[role] || [];
    } catch (error) {
      console.error('Error getting accessible menu items:', error);
      return [];
    }
  }
};

export default RBACManager;